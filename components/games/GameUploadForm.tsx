"use client";

import { useState } from "react";
import JSZip, { type JSZipObject } from "jszip";
import { type Result } from "@/types/common/result";
import { SGame } from "@/schema/game";
import {
  isStructuredUploadGameError,
  type HtmlZipValidationError,
  type UploadGameActionError,
} from "@/lib/validation/game-zip";
import {
  MAX_MODEL_WEIGHT_TOTAL_BYTES,
  formatMegabytes,
  isModelWeightFile,
} from "@/lib/validation/model-weight";

interface GameUploadFormProps {
  action: (formData: FormData) => Promise<Result<{ game: SGame }, UploadGameActionError>>;
  onSuccess: (data: { game: SGame }) => void;
}

interface WeightPrecheckResult {
  totalBytes: number;
  files: { path: string; bytes: number }[];
  exceeded: boolean;
}

// JSZip exposes the uncompressed size of each entry through its internal
// `_data.uncompressedSize` field. This has been stable across major JSZip
// releases and avoids decompressing every weight file just to measure size.
interface JSZipObjectWithInternal extends JSZipObject {
  _data?: { uncompressedSize?: number };
}

async function measureEntryBytes(entry: JSZipObject): Promise<number> {
  const internal = entry as JSZipObjectWithInternal;
  const known = internal._data?.uncompressedSize;
  if (typeof known === "number" && Number.isFinite(known) && known >= 0) {
    return known;
  }
  const data = await entry.async("uint8array");
  return data.byteLength;
}

async function precheckWeightFiles(file: File): Promise<WeightPrecheckResult | { error: string }> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    return { error: "无法解析 ZIP 文件，请确认文件未损坏" };
  }

  const weightEntries: JSZipObject[] = [];
  for (const [, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (!isModelWeightFile(entry.name)) continue;
    weightEntries.push(entry);
  }

  let totalBytes = 0;
  const files: { path: string; bytes: number }[] = [];
  for (const entry of weightEntries) {
    const bytes = await measureEntryBytes(entry);
    totalBytes += bytes;
    files.push({ path: entry.name, bytes });
  }

  return {
    totalBytes,
    files,
    exceeded: totalBytes > MAX_MODEL_WEIGHT_TOTAL_BYTES,
  };
}

export function GameUploadForm({ action, onSuccess }: GameUploadFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [error, setError] = useState<UploadGameActionError | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrechecking, setIsPrechecking] = useState(false);
  const [weightPrecheck, setWeightPrecheck] = useState<WeightPrecheckResult | null>(null);

  const handleFileChange = async (file: File | null) => {
    setZipFile(file);
    setWeightPrecheck(null);
    setError(null);

    if (!file) return;

    setIsPrechecking(true);
    const result = await precheckWeightFiles(file);
    setIsPrechecking(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setWeightPrecheck(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (weightPrecheck?.exceeded) {
      setError(
        `ZIP 中 AI 模型权重文件合计 ${formatMegabytes(weightPrecheck.totalBytes)}，` +
          `超过上限 ${formatMegabytes(MAX_MODEL_WEIGHT_TOTAL_BYTES)}，请删减权重后重试`,
      );
      return;
    }

    setError(null);
    setIsSaving(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    if (zipFile) {
      formData.append("zipFile", zipFile);
    }

    const result = await action(formData);

    if (!result.success) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    onSuccess(result.data);
  };

  const validationError = getHtmlValidationError(error);
  const errorMessage = getErrorMessage(error);
  const weightDetails = getWeightDetails(error);
  const submitDisabled = isSaving || isPrechecking || (weightPrecheck?.exceeded ?? false);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          <p>{errorMessage}</p>
          {validationError && (
            <ul className="mt-3 list-disc pl-5 text-sm">
              {validationError.violations.map((violation, index) => (
                <li key={`${violation.file}-${violation.type}-${index}`}>
                  {violation.message || `${violation.file}: ${violation.type}`}
                </li>
              ))}
            </ul>
          )}
          {weightDetails && weightDetails.files.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm">
              {weightDetails.files.map((f) => (
                <li key={f.path}>
                  {f.path} — {formatMegabytes(f.bytes)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your game title..."
          required
          disabled={isSaving}
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Describe your game..."
          required
          rows={3}
          disabled={isSaving}
        />
      </div>

      <div>
        <label
          htmlFor="zipFile"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Game Files (ZIP, max 500MB)
        </label>
        <input
          id="zipFile"
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={(e) => {
            void handleFileChange(e.target.files?.[0] || null);
          }}
          disabled={isSaving}
          className="block w-full text-sm text-gray-700 border border-dashed border-gray-300 rounded-lg px-4 py-3 bg-white cursor-pointer hover:border-blue-400"
          required
        />
        {zipFile && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: {zipFile.name} ({(zipFile.size / (1024 * 1024)).toFixed(2)} MB)
          </p>
        )}
        {isPrechecking && (
          <p className="mt-2 text-sm text-gray-500">正在检查 ZIP 中的 AI 模型权重文件…</p>
        )}
        {weightPrecheck && !isPrechecking && (
          <div
            className={`mt-2 text-sm ${
              weightPrecheck.exceeded ? "text-red-600" : "text-gray-600"
            }`}
          >
            <p>
              检测到 {weightPrecheck.files.length} 个 AI 模型权重文件，合计{" "}
              {formatMegabytes(weightPrecheck.totalBytes)}（上限{" "}
              {formatMegabytes(MAX_MODEL_WEIGHT_TOTAL_BYTES)}）。
            </p>
            {weightPrecheck.exceeded && (
              <p className="mt-1">请删减权重文件后再上传。</p>
            )}
          </div>
        )}
        <p className="mt-1 text-xs text-gray-500">
          The ZIP must contain an index.html at the root level. HTML files cannot contain inline JavaScript.
          AI model weight files (.pth/.safetensors/.pt/.ckpt/.onnx/.gguf 等) combined size must be ≤{" "}
          {formatMegabytes(MAX_MODEL_WEIGHT_TOTAL_BYTES)}.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={submitDisabled}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Uploading..." : isPrechecking ? "Checking..." : "Upload Game"}
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function getErrorMessage(error: UploadGameActionError | null): string | null {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return error;
  }

  return error.message;
}

function getHtmlValidationError(
  error: UploadGameActionError | null,
): HtmlZipValidationError | null {
  if (!error || !isStructuredUploadGameError(error)) {
    return null;
  }

  return error.code === "html_validation_failed" ? error : null;
}

function getWeightDetails(
  error: UploadGameActionError | null,
): { files: { path: string; bytes: number }[] } | null {
  if (!error || typeof error === "string" || !("code" in error)) {
    return null;
  }
  if (error.code !== "model_weight_total_too_large") return null;
  return error.modelWeightDetails ?? null;
}

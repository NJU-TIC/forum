"use client";

import Link from "next/link";
import { useState } from "react";
import { type Result } from "@/types/common/result";
import { type UploadGameActionSuccessData } from "@/types/game-upload";
import {
  isStructuredUploadGameError,
  type HtmlZipValidationError,
  type UploadGameActionError,
} from "@/lib/validation/game-zip";

interface GameUploadFormProps {
  action: (
    formData: FormData,
  ) => Promise<Result<UploadGameActionSuccessData, UploadGameActionError>>;
}

export function GameUploadForm({ action }: GameUploadFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [error, setError] = useState<UploadGameActionError | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successData, setSuccessData] = useState<UploadGameActionSuccessData | null>(
    null,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setSuccessData(result.data);
    setIsSaving(false);
  };

  const validationError = getHtmlValidationError(error);
  const errorMessage = getErrorMessage(error);

  if (successData) {
    return (
      <UploadSummary
        data={successData}
        onUploadAnother={() => {
          setSuccessData(null);
          setTitle("");
          setDescription("");
          setZipFile(null);
          setError(null);
          setIsSaving(false);
        }}
      />
    );
  }

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
            setZipFile(e.target.files?.[0] || null);
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
        <p className="mt-1 text-xs text-gray-500">
          The ZIP must contain an index.html at the root level. HTML files cannot contain inline JavaScript.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Uploading..." : "Upload Game"}
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

interface UploadSummaryProps {
  data: UploadGameActionSuccessData;
  onUploadAnother: () => void;
}

function UploadSummary({ data, onUploadAnother }: UploadSummaryProps) {
  const { game, jsAnalysis } = data;
  const isOverLimit = jsAnalysis.excessChars > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-green-200 bg-green-50 p-6">
        <h2 className="text-xl font-semibold text-green-900">上传成功</h2>
        <p className="mt-2 text-sm text-green-800">
          作品已上传完成，以下是 ZIP 中 JavaScript 压缩后的字符统计结果。
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">JS 压缩统计</h3>
        <dl className="mt-4 grid gap-4 text-sm text-gray-700 sm:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-4">
            <dt className="text-gray-500">压缩后 JS 总字符数</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatNumber(jsAnalysis.totalMinifiedJsChars)}
            </dd>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <dt className="text-gray-500">字符上限</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatNumber(jsAnalysis.jsCharLimit)}
            </dd>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <dt className="text-gray-500">是否超限</dt>
            <dd
              className={`mt-1 text-2xl font-semibold ${
                isOverLimit ? "text-red-600" : "text-green-600"
              }`}
            >
              {isOverLimit ? "是" : "否"}
            </dd>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <dt className="text-gray-500">超出字符数</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatNumber(jsAnalysis.excessChars)}
            </dd>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 sm:col-span-2">
            <dt className="text-gray-500">票数系数</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {jsAnalysis.scoreMultiplier.toFixed(4)}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-900">JS 文件明细</h4>
          {jsAnalysis.jsFiles.length > 0 ? (
            <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-100">
              {jsAnalysis.jsFiles.map((file) => (
                <li
                  key={file.path}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                >
                  <span className="break-all text-gray-700">{file.path}</span>
                  <span className="shrink-0 font-medium text-gray-900">
                    {formatNumber(file.minifiedChars)} 字符
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              未发现需要统计的本地 JS 文件。
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link
          href={`/games/${game._id}`}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          进入作品详情
        </Link>
        <button
          type="button"
          onClick={onUploadAnother}
          className="px-6 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          继续上传其他作品
        </button>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString("zh-CN");
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

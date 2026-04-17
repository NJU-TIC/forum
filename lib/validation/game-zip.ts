import JSZip, { type JSZipObject } from "jszip";
import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

type Element = DefaultTreeAdapterMap["element"];

const HTML_FILE_PATTERN = /\.html?$/i;
const JAVASCRIPT_PROTOCOL_ATTRS = new Set(["href", "src", "action", "formaction"]);
const ALLOWED_SCRIPT_TYPES = new Set(["application/json", "application/ld+json"]);

export const DEFAULT_GAME_ZIP_LIMITS = {
  maxEntries: 500,
  maxTotalUncompressedBytes: 8 * 1024 * 1024,
  maxFileBytes: 2 * 1024 * 1024,
  maxDirectoryDepth: 32,
  maxPathLength: 260,
  maxProcessingMs: 5000,
} as const;

export interface GameZipLimits {
  maxEntries: number;
  maxTotalUncompressedBytes: number;
  maxFileBytes: number;
  maxDirectoryDepth: number;
  maxPathLength: number;
  maxProcessingMs: number;
  requireRootIndexHtml?: boolean;
}

export type GameZipViolationType =
  | "inline_script"
  | "inline_event_handler"
  | "javascript_protocol";

export interface GameZipViolation {
  file: string;
  type: GameZipViolationType;
  message?: string;
}

export interface HtmlZipAnalysisErrorResult {
  passed: false;
  violations: GameZipViolation[];
  error: GameZipAnalysisError;
}

export interface GameZipEntry {
  path: string;
  data: Buffer;
}

export interface HtmlZipAnalysisPassedResult {
  passed: true;
  violations: GameZipViolation[];
}

export interface HtmlZipAnalysisViolationResult {
  passed: false;
  violations: GameZipViolation[];
  error?: undefined;
}

export type HtmlZipAnalysisResult =
  | HtmlZipAnalysisPassedResult
  | HtmlZipAnalysisViolationResult
  | HtmlZipAnalysisErrorResult;

export interface InspectedGameZipPassedResult extends HtmlZipAnalysisPassedResult {
  entries: GameZipEntry[];
}

export interface InspectedGameZipViolationResult extends HtmlZipAnalysisViolationResult {
  entries?: undefined;
}

export type InspectedGameZipResult =
  | InspectedGameZipPassedResult
  | InspectedGameZipViolationResult
  | HtmlZipAnalysisErrorResult;

export type GameZipAnalysisErrorCode =
  | "invalid_zip"
  | "dangerous_zip_entry"
  | "resource_limit_exceeded"
  | "analysis_timeout"
  | "missing_index_html"
  | "invalid_html_file";

export interface GameZipAnalysisError {
  code: GameZipAnalysisErrorCode;
  message: string;
  file?: string;
}

export type HtmlZipValidationError = HtmlZipAnalysisViolationResult & {
  code: "html_validation_failed";
  message: string;
};

export type UploadGameActionError =
  | string
  | GameZipAnalysisError
  | HtmlZipValidationError;

interface ZipEntrySizeData {
  uncompressedSize?: number;
}

interface ZipEntryWithSize extends JSZipObject {
  _data?: ZipEntrySizeData;
  unsafeOriginalName?: string;
}

type PathNormalizationResult =
  | {
      ok: true;
      data: string;
    }
  | (HtmlZipAnalysisErrorResult & {
      ok: false;
    });

export function isStructuredUploadGameError(
  error: UploadGameActionError,
): error is GameZipAnalysisError | HtmlZipValidationError {
  return typeof error === "object" && error !== null && "code" in error;
}

export function hasGameZipAnalysisError(
  result: HtmlZipAnalysisResult | InspectedGameZipResult,
): result is HtmlZipAnalysisErrorResult {
  return "error" in result && result.error !== undefined;
}

function createAnalysisError(
  code: GameZipAnalysisErrorCode,
  message: string,
  file?: string,
): HtmlZipAnalysisErrorResult {
  return {
    passed: false,
    violations: [],
    error: {
      code,
      message,
      file,
    },
  };
}

export function createHtmlZipValidationError(
  violations: GameZipViolation[],
): HtmlZipValidationError {
  const count = violations.length;
  return {
    code: "html_validation_failed",
    message: `ZIP 中共发现 ${count} 处 HTML 内嵌 JavaScript 违规`,
    passed: false,
    violations,
  };
}

export async function analyzeGameZip(
  source: ArrayBuffer | Uint8Array,
  options?: Partial<GameZipLimits>,
): Promise<HtmlZipAnalysisResult> {
  const inspection = await inspectGameZip(source, options);
  if (hasGameZipAnalysisError(inspection)) {
    return {
      passed: false,
      violations: [],
      error: inspection.error,
    };
  }

  if (inspection.passed) {
    return {
      passed: true,
      violations: inspection.violations,
    };
  }

  return {
    passed: false,
    violations: inspection.violations,
  };
}

export async function inspectGameZip(
  source: ArrayBuffer | Uint8Array,
  options?: Partial<GameZipLimits>,
): Promise<InspectedGameZipResult> {
  const limits = { ...DEFAULT_GAME_ZIP_LIMITS, ...options };
  const deadline = Date.now() + limits.maxProcessingMs;

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(source);
  } catch {
    return createAnalysisError("invalid_zip", "ZIP 文件无效，无法解析");
  }

  const zipEntries = Object.entries(zip.files);
  if (zipEntries.length > limits.maxEntries) {
    return createAnalysisError(
      "resource_limit_exceeded",
      `ZIP 条目数量超限，最多允许 ${limits.maxEntries} 个`,
    );
  }

  const entries: GameZipEntry[] = [];
  let totalUncompressedBytes = 0;

  for (const [rawPath, zipEntry] of zipEntries) {
    const timeError = getTimeoutError(deadline);
    if (timeError) {
      return createAnalysisError(timeError.code, timeError.message, timeError.file);
    }

    const originalPath = (zipEntry as ZipEntryWithSize).unsafeOriginalName ?? rawPath;
    const normalizedPathResult = normalizeZipEntryPath(originalPath, zipEntry.dir, limits);
    if (!normalizedPathResult.ok) {
      return {
        passed: false,
        violations: [],
        error: normalizedPathResult.error,
      };
    }

    const normalizedPath = normalizedPathResult.data;
    if (zipEntry.dir) {
      continue;
    }

    const sizeHint = getUncompressedSizeHint(zipEntry);
    if (typeof sizeHint === "number" && sizeHint > limits.maxFileBytes) {
      return createAnalysisError(
        "resource_limit_exceeded",
        `文件 "${normalizedPath}" 大小超限，单文件最大允许 ${formatMiB(limits.maxFileBytes)}MB`,
        normalizedPath,
      );
    }

    let fileData: Uint8Array;
    try {
      fileData = await zipEntry.async("uint8array");
    } catch {
      return createAnalysisError(
        "invalid_zip",
        `无法读取 ZIP 条目 "${normalizedPath}"`,
        normalizedPath,
      );
    }

    const readTimeoutError = getTimeoutError(deadline);
    if (readTimeoutError) {
      return createAnalysisError(
        readTimeoutError.code,
        readTimeoutError.message,
        readTimeoutError.file,
      );
    }

    if (fileData.byteLength > limits.maxFileBytes) {
      return createAnalysisError(
        "resource_limit_exceeded",
        `文件 "${normalizedPath}" 大小超限，单文件最大允许 ${formatMiB(limits.maxFileBytes)}MB`,
        normalizedPath,
      );
    }

    totalUncompressedBytes += fileData.byteLength;
    if (totalUncompressedBytes > limits.maxTotalUncompressedBytes) {
      return createAnalysisError(
        "resource_limit_exceeded",
        `ZIP 解压后的总大小超限，最大允许 ${formatMiB(limits.maxTotalUncompressedBytes)}MB`,
      );
    }

    entries.push({
      path: normalizedPath,
      data: Buffer.from(fileData),
    });
  }

  if (entries.length === 0) {
    return createAnalysisError("invalid_zip", "ZIP 中没有可分析的文件");
  }

  unwrapSingleTopLevelDirectory(entries);

  if (limits.requireRootIndexHtml && !hasRootIndexHtml(entries)) {
    return createAnalysisError(
      "missing_index_html",
      "ZIP 根目录必须包含 index.html 或 index.htm",
    );
  }

  const violations: GameZipViolation[] = [];

  for (const entry of entries) {
    if (!HTML_FILE_PATTERN.test(entry.path)) {
      continue;
    }

    const htmlTimeoutError = getTimeoutError(deadline);
    if (htmlTimeoutError) {
      return createAnalysisError(
        htmlTimeoutError.code,
        htmlTimeoutError.message,
        htmlTimeoutError.file,
      );
    }

    try {
      const html = entry.data.toString("utf8");
      violations.push(...findHtmlViolations(entry.path, html, deadline));
    } catch (error) {
      return createAnalysisError(
        "invalid_html_file",
        error instanceof Error
          ? `分析 HTML 文件 "${entry.path}" 时失败：${error.message}`
          : `分析 HTML 文件 "${entry.path}" 时失败`,
        entry.path,
      );
    }
  }

  if (violations.length > 0) {
    return {
      passed: false,
      violations,
    };
  }

  return {
    passed: true,
    violations,
    entries,
  };
}

function findHtmlViolations(
  filePath: string,
  html: string,
  deadline: number,
): GameZipViolation[] {
  const violations: GameZipViolation[] = [];
  const doc = parse(html);

  let visited = 0;
  walk(doc, (el) => {
    visited++;
    if ((visited & 127) === 0 && Date.now() > deadline) {
      throw new Error("ZIP 分析超时，已中止处理");
    }

    collectAttributeViolations(filePath, el.attrs, violations);

    if (el.tagName === "script") {
      if (isExecutableInlineScript(el.attrs, textContent(el))) {
        violations.push({
          file: filePath,
          type: "inline_script",
          message: `文件 "${filePath}" 中发现可执行的内联 <script>`,
        });
      }
    }
  });

  return violations;
}

function collectAttributeViolations(
  filePath: string,
  attributes: Element["attrs"],
  violations: GameZipViolation[],
): void {
  for (const attribute of attributes) {
    if (attribute.name.startsWith("on") && attribute.value.trim().length > 0) {
      violations.push({
        file: filePath,
        type: "inline_event_handler",
        message: `文件 "${filePath}" 中发现内联事件处理器属性 "${attribute.name}"`,
      });
    }

    if (
      JAVASCRIPT_PROTOCOL_ATTRS.has(attribute.name) &&
      isJavascriptProtocol(attribute.value)
    ) {
      violations.push({
        file: filePath,
        type: "javascript_protocol",
        message: `文件 "${filePath}" 中的属性 "${attribute.name}" 使用了 javascript: 协议`,
      });
    }
  }
}

function walk(
  node: DefaultTreeAdapterMap["node"],
  visitor: (el: Element) => void,
): void {
  if ("tagName" in node) {
    visitor(node as Element);
  }

  const children: DefaultTreeAdapterMap["node"][] =
    "content" in node
      ? (node as DefaultTreeAdapterMap["template"]).content.childNodes
      : "childNodes" in node
        ? (node as { childNodes: DefaultTreeAdapterMap["node"][] }).childNodes
        : [];

  for (const child of children) {
    walk(child, visitor);
  }
}

function textContent(el: Element): string {
  let text = "";
  for (const child of el.childNodes) {
    if ("value" in child) {
      text += (child as DefaultTreeAdapterMap["textNode"]).value;
    }
  }
  return text;
}

function isExecutableInlineScript(
  attributes: Element["attrs"],
  scriptContent: string,
): boolean {
  let hasSrc = false;
  let scriptType = "";

  for (const attribute of attributes) {
    if (attribute.name === "src") {
      hasSrc = true;
      continue;
    }

    if (attribute.name === "type") {
      scriptType = attribute.value.trim().toLowerCase();
    }
  }

  if (hasSrc) {
    return false;
  }

  if (ALLOWED_SCRIPT_TYPES.has(scriptType)) {
    return false;
  }

  return scriptContent.trim().length > 0;
}

function isJavascriptProtocol(value: string): boolean {
  if (!value.length) return false;

  const normalized = value
    .replace(/^[\u0000-\u0020\u007f]+|[\u0000-\u0020\u007f]+$/g, "")
    .toLowerCase();

  return normalized.startsWith("javascript:");
}

function unwrapSingleTopLevelDirectory(entries: GameZipEntry[]): void {
  const topLevelDirectories = new Set(entries.map((entry) => entry.path.split("/")[0]));
  const hasRootFile = entries.some((entry) => entry.path.split("/").length === 1);

  if (topLevelDirectories.size !== 1 || hasRootFile) {
    return;
  }

  const [prefix] = [...topLevelDirectories];
  const prefixWithSlash = `${prefix}/`;

  for (const entry of entries) {
    entry.path = entry.path.slice(prefixWithSlash.length);
  }
}

export function hasRootIndexHtml(entries: Pick<GameZipEntry, "path">[]): boolean {
  return entries.some((entry) => /^index\.html?$/i.test(entry.path));
}

function normalizeZipEntryPath(
  rawPath: string,
  isDirectory: boolean,
  limits: GameZipLimits,
): PathNormalizationResult {
  if (!rawPath) {
    return dangerousZipEntry("ZIP 条目路径为空");
  }

  const slashNormalizedPath = rawPath.replace(/\\/g, "/");
  if (
    slashNormalizedPath.startsWith("/") ||
    slashNormalizedPath.startsWith("//") ||
    /^[a-zA-Z]:\//.test(slashNormalizedPath)
  ) {
    return dangerousZipEntry(`ZIP 条目路径 "${rawPath}" 不是相对路径`);
  }

  const normalizedSegments: string[] = [];
  const rawSegments = slashNormalizedPath.split("/");

  for (const rawSegment of rawSegments) {
    if (rawSegment === "" || rawSegment === ".") {
      continue;
    }

    if (rawSegment === "..") {
      return dangerousZipEntry(`ZIP 条目路径 "${rawPath}" 试图逃逸出根目录`);
    }

    normalizedSegments.push(rawSegment);
  }

  if (normalizedSegments.length === 0) {
    return dangerousZipEntry(`ZIP 条目路径 "${rawPath}" 无效`);
  }

  const normalizedPath = normalizedSegments.join("/");
  const directoryDepth = Math.max(0, normalizedSegments.length - (isDirectory ? 0 : 1));

  if (directoryDepth > limits.maxDirectoryDepth) {
    return createPathNormalizationError(
      "resource_limit_exceeded",
      `ZIP 条目 "${normalizedPath}" 的目录深度超限，最大允许 ${limits.maxDirectoryDepth} 层`,
      normalizedPath,
    );
  }

  if (normalizedPath.length > limits.maxPathLength) {
    return createPathNormalizationError(
      "resource_limit_exceeded",
      `ZIP 条目路径 "${normalizedPath}" 长度超限，最大允许 ${limits.maxPathLength} 个字符`,
      normalizedPath,
    );
  }

  return {
    ok: true,
    data: normalizedPath,
  };
}

function dangerousZipEntry(message: string): PathNormalizationResult {
  return createPathNormalizationError("dangerous_zip_entry", message);
}

function createPathNormalizationError(
  code: GameZipAnalysisErrorCode,
  message: string,
  file?: string,
): PathNormalizationResult {
  return {
    ok: false,
    passed: false,
    violations: [],
    error: {
      code,
      message,
      file,
    },
  };
}

function getUncompressedSizeHint(zipEntry: JSZipObject): number | undefined {
  const hintedSize = (zipEntry as ZipEntryWithSize)._data?.uncompressedSize;
  return typeof hintedSize === "number" ? hintedSize : undefined;
}

function formatMiB(bytes: number): string {
  return String(bytes / (1024 * 1024));
}

function getTimeoutError(deadline: number): GameZipAnalysisError | null {
  if (Date.now() <= deadline) {
    return null;
  }

  return {
    code: "analysis_timeout",
    message: "ZIP 分析超时，已中止处理",
  };
}

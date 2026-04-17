import JSZip, { type JSZipObject } from "jszip";

const HTML_FILE_PATTERN = /\.html?$/i;
const JAVASCRIPT_PROTOCOL_ATTRS = new Set(["href", "src", "action", "formaction"]);
const ALLOWED_SCRIPT_TYPES = new Set(["application/json", "application/ld+json"]);
const RAW_TEXT_TAGS = new Set(["script", "style", "textarea", "title"]);
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: "\u00a0",
  colon: ":",
  tab: "\t",
  newline: "\n",
};

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

interface ParsedAttribute {
  name: string;
  value: string;
}

interface ParsedStartTag {
  tagName: string;
  attributes: ParsedAttribute[];
  nextIndex: number;
  selfClosing: boolean;
}

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
  let index = 0;

  while (index < html.length) {
    if ((index & 1023) === 0) {
      const timeoutError = getTimeoutError(deadline);
      if (timeoutError) {
        throw new Error(timeoutError.message);
      }
    }

    if (html.charCodeAt(index) !== 60) {
      index += 1;
      continue;
    }

    if (html.startsWith("<!--", index)) {
      const commentEnd = html.indexOf("-->", index + 4);
      index = commentEnd === -1 ? html.length : commentEnd + 3;
      continue;
    }

    if (html.startsWith("</", index)) {
      const closingTagEnd = html.indexOf(">", index + 2);
      index = closingTagEnd === -1 ? html.length : closingTagEnd + 1;
      continue;
    }

    if (html.startsWith("<!", index) || html.startsWith("<?", index)) {
      const declarationEnd = html.indexOf(">", index + 2);
      index = declarationEnd === -1 ? html.length : declarationEnd + 1;
      continue;
    }

    const parsedStartTag = parseStartTag(html, index);
    if (!parsedStartTag) {
      index += 1;
      continue;
    }

    index = parsedStartTag.nextIndex;
    collectAttributeViolations(filePath, parsedStartTag.attributes, violations);

    if (!RAW_TEXT_TAGS.has(parsedStartTag.tagName) || parsedStartTag.selfClosing) {
      continue;
    }

    const rawTextRegion = readRawTextRegion(html, index, parsedStartTag.tagName);

    if (parsedStartTag.tagName === "script") {
      const scriptContent = html.slice(index, rawTextRegion.contentEnd);
      if (isExecutableInlineScript(parsedStartTag.attributes, scriptContent)) {
        violations.push({
          file: filePath,
          type: "inline_script",
          message: `文件 "${filePath}" 中发现可执行的内联 <script>`,
        });
      }
    }

    index = rawTextRegion.nextIndex;
  }

  return violations;
}

function collectAttributeViolations(
  filePath: string,
  attributes: ParsedAttribute[],
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

function parseStartTag(html: string, index: number): ParsedStartTag | null {
  let cursor = index + 1;
  cursor = skipWhitespace(html, cursor);

  if (!isTagNameStartCharacter(html.charCodeAt(cursor))) {
    return null;
  }

  const nameStart = cursor;
  while (cursor < html.length && isTagNameCharacter(html.charCodeAt(cursor))) {
    cursor += 1;
  }

  if (cursor === nameStart) {
    return null;
  }

  const tagName = html.slice(nameStart, cursor).toLowerCase();
  const attributes: ParsedAttribute[] = [];
  let selfClosing = false;

  while (cursor < html.length) {
    cursor = skipWhitespace(html, cursor);

    if (cursor >= html.length) {
      break;
    }

    const current = html.charCodeAt(cursor);
    if (current === 62) {
      cursor += 1;
      break;
    }

    if (current === 47 && html.charCodeAt(cursor + 1) === 62) {
      selfClosing = true;
      cursor += 2;
      break;
    }

    const attrNameStart = cursor;
    while (cursor < html.length && isAttributeNameCharacter(html.charCodeAt(cursor))) {
      cursor += 1;
    }

    if (cursor === attrNameStart) {
      cursor += 1;
      continue;
    }

    const name = html.slice(attrNameStart, cursor).toLowerCase();
    cursor = skipWhitespace(html, cursor);

    let value = "";
    if (html.charCodeAt(cursor) === 61) {
      cursor += 1;
      cursor = skipWhitespace(html, cursor);

      const quote = html.charCodeAt(cursor);
      if (quote === 34 || quote === 39) {
        cursor += 1;
        const valueStart = cursor;
        while (cursor < html.length && html.charCodeAt(cursor) !== quote) {
          cursor += 1;
        }
        value = html.slice(valueStart, cursor);
        if (cursor < html.length) {
          cursor += 1;
        }
      } else {
        const valueStart = cursor;
        while (
          cursor < html.length &&
          !isWhitespace(html.charCodeAt(cursor)) &&
          html.charCodeAt(cursor) !== 62
        ) {
          cursor += 1;
        }
        value = html.slice(valueStart, cursor);
      }
    }

    attributes.push({ name, value });
  }

  return {
    tagName,
    attributes,
    nextIndex: cursor,
    selfClosing,
  };
}

function readRawTextRegion(
  html: string,
  startIndex: number,
  tagName: string,
): { contentEnd: number; nextIndex: number } {
  let cursor = startIndex;

  while (cursor < html.length) {
    const nextLt = html.indexOf("<", cursor);
    if (nextLt === -1) {
      return {
        contentEnd: html.length,
        nextIndex: html.length,
      };
    }

    if (isClosingTag(html, nextLt, tagName)) {
      const closingTagEnd = html.indexOf(">", nextLt + 2);
      return {
        contentEnd: nextLt,
        nextIndex: closingTagEnd === -1 ? html.length : closingTagEnd + 1,
      };
    }

    cursor = nextLt + 1;
  }

  return {
    contentEnd: html.length,
    nextIndex: html.length,
  };
}

function isClosingTag(html: string, index: number, tagName: string): boolean {
  if (!html.startsWith("</", index)) {
    return false;
  }

  const candidate = html.slice(index + 2, index + 2 + tagName.length).toLowerCase();
  if (candidate !== tagName) {
    return false;
  }

  const trailing = html.charCodeAt(index + 2 + tagName.length);
  return trailing === 62 || isWhitespace(trailing);
}

function isExecutableInlineScript(
  attributes: ParsedAttribute[],
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
  if (value.length === 0) {
    return false;
  }

  const normalizedValue = decodeHtmlEntities(value)
    .replace(/^[\u0000-\u0020\u007f]+|[\u0000-\u0020\u007f]+$/g, "")
    .toLowerCase();

  return normalizedValue.startsWith("javascript:");
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[0-9a-z]+);?/gi, (match, body: string) => {
    const entity = body.toLowerCase();
    if (entity.startsWith("#x")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(codePoint) ? safeCodePoint(codePoint) : match;
    }

    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? safeCodePoint(codePoint) : match;
    }

    return NAMED_HTML_ENTITIES[entity] ?? match;
  });
}

function safeCodePoint(codePoint: number): string {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return "\uFFFD";
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return "\uFFFD";
  }
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

function isTagNameStartCharacter(code: number): boolean {
  return (
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122)
  );
}

function isTagNameCharacter(code: number): boolean {
  return isTagNameStartCharacter(code) || (code >= 48 && code <= 57) || code === 45 || code === 58;
}

function isAttributeNameCharacter(code: number): boolean {
  return code > 32 && code !== 47 && code !== 61 && code !== 62;
}

function skipWhitespace(input: string, index: number): number {
  let cursor = index;
  while (cursor < input.length && isWhitespace(input.charCodeAt(cursor))) {
    cursor += 1;
  }
  return cursor;
}

function isWhitespace(code: number): boolean {
  return code === 9 || code === 10 || code === 12 || code === 13 || code === 32;
}

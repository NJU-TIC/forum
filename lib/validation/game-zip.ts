import JSZip, { type JSZipObject } from "jszip";
import type { Result } from "../../types/common/result.ts";

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
  maxEntries: 1000,
  maxTotalUncompressedBytes: 50 * 1024 * 1024,
  maxFileBytes: 10 * 1024 * 1024,
  maxDirectoryDepth: 64,
  maxPathLength: 512,
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

export interface HtmlZipAnalysisResult {
  passed: boolean;
  violations: GameZipViolation[];
}

export interface GameZipEntry {
  path: string;
  data: Buffer;
}

export interface InspectedGameZip extends HtmlZipAnalysisResult {
  entries: GameZipEntry[];
}

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

export interface HtmlZipValidationError extends HtmlZipAnalysisResult {
  code: "html_validation_failed";
  message: string;
  passed: false;
}

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
}

export function isStructuredUploadGameError(
  error: UploadGameActionError,
): error is GameZipAnalysisError | HtmlZipValidationError {
  return typeof error === "object" && error !== null && "code" in error;
}

export function createHtmlZipValidationError(
  violations: GameZipViolation[],
): HtmlZipValidationError {
  const count = violations.length;
  return {
    code: "html_validation_failed",
    message: `Found ${count} HTML JavaScript violation${count === 1 ? "" : "s"} in the ZIP`,
    passed: false,
    violations,
  };
}

export async function analyzeGameZip(
  source: ArrayBuffer | Uint8Array,
  options?: Partial<GameZipLimits>,
): Promise<Result<HtmlZipAnalysisResult, GameZipAnalysisError>> {
  const inspection = await inspectGameZip(source, options);
  if (!inspection.success) {
    return inspection;
  }

  return {
    success: true,
    data: {
      passed: inspection.data.passed,
      violations: inspection.data.violations,
    },
  };
}

export async function inspectGameZip(
  source: ArrayBuffer | Uint8Array,
  options?: Partial<GameZipLimits>,
): Promise<Result<InspectedGameZip, GameZipAnalysisError>> {
  const limits = { ...DEFAULT_GAME_ZIP_LIMITS, ...options };
  const deadline = Date.now() + limits.maxProcessingMs;

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(source);
  } catch {
    return {
      success: false,
      error: {
        code: "invalid_zip",
        message: "Invalid ZIP file",
      },
    };
  }

  const zipEntries = Object.entries(zip.files);
  if (zipEntries.length > limits.maxEntries) {
    return {
      success: false,
      error: {
        code: "resource_limit_exceeded",
        message: `ZIP contains too many entries (max ${limits.maxEntries})`,
      },
    };
  }

  const entries: GameZipEntry[] = [];
  let totalUncompressedBytes = 0;

  for (const [rawPath, zipEntry] of zipEntries) {
    const timeError = getTimeoutError(deadline);
    if (timeError) {
      return { success: false, error: timeError };
    }

    const normalizedPathResult = normalizeZipEntryPath(rawPath, zipEntry.dir, limits);
    if (!normalizedPathResult.success) {
      return normalizedPathResult;
    }

    const normalizedPath = normalizedPathResult.data;
    if (zipEntry.dir) {
      continue;
    }

    if (isHiddenOrSystemPath(normalizedPath)) {
      continue;
    }

    const sizeHint = getUncompressedSizeHint(zipEntry);
    if (typeof sizeHint === "number" && sizeHint > limits.maxFileBytes) {
      return {
        success: false,
        error: {
          code: "resource_limit_exceeded",
          file: normalizedPath,
          message: `File "${normalizedPath}" is too large (max ${formatMiB(limits.maxFileBytes)}MB per file)`,
        },
      };
    }

    let fileData: Uint8Array;
    try {
      fileData = await zipEntry.async("uint8array");
    } catch {
      return {
        success: false,
        error: {
          code: "invalid_zip",
          file: normalizedPath,
          message: `Failed to read ZIP entry "${normalizedPath}"`,
        },
      };
    }

    const readTimeoutError = getTimeoutError(deadline);
    if (readTimeoutError) {
      return { success: false, error: readTimeoutError };
    }

    if (fileData.byteLength > limits.maxFileBytes) {
      return {
        success: false,
        error: {
          code: "resource_limit_exceeded",
          file: normalizedPath,
          message: `File "${normalizedPath}" is too large (max ${formatMiB(limits.maxFileBytes)}MB per file)`,
        },
      };
    }

    totalUncompressedBytes += fileData.byteLength;
    if (totalUncompressedBytes > limits.maxTotalUncompressedBytes) {
      return {
        success: false,
        error: {
          code: "resource_limit_exceeded",
          message: `ZIP expands beyond the allowed size (max ${formatMiB(limits.maxTotalUncompressedBytes)}MB)`,
        },
      };
    }

    entries.push({
      path: normalizedPath,
      data: Buffer.from(fileData),
    });
  }

  if (entries.length === 0) {
    return {
      success: false,
      error: {
        code: "invalid_zip",
        message: "ZIP file contains no files",
      },
    };
  }

  unwrapSingleTopLevelDirectory(entries);

  if (limits.requireRootIndexHtml && !hasRootIndexHtml(entries)) {
    return {
      success: false,
      error: {
        code: "missing_index_html",
        message: "ZIP must contain an index.html (or index.htm) at the root level",
      },
    };
  }

  const violations: GameZipViolation[] = [];

  for (const entry of entries) {
    if (!HTML_FILE_PATTERN.test(entry.path)) {
      continue;
    }

    const htmlTimeoutError = getTimeoutError(deadline);
    if (htmlTimeoutError) {
      return { success: false, error: htmlTimeoutError };
    }

    try {
      const html = entry.data.toString("utf8");
      violations.push(...findHtmlViolations(entry.path, html, deadline));
    } catch (error) {
      return {
        success: false,
        error: {
          code: "invalid_html_file",
          file: entry.path,
          message: error instanceof Error
            ? `Failed to analyze HTML file "${entry.path}": ${error.message}`
            : `Failed to analyze HTML file "${entry.path}"`,
        },
      };
    }
  }

  return {
    success: true,
    data: {
      entries,
      passed: violations.length === 0,
      violations,
    },
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
          message: `Executable inline <script> found in "${filePath}"`,
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
        message: `Inline event handler "${attribute.name}" found in "${filePath}"`,
      });
    }

    if (
      JAVASCRIPT_PROTOCOL_ATTRS.has(attribute.name) &&
      isJavascriptProtocol(attribute.value)
    ) {
      violations.push({
        file: filePath,
        type: "javascript_protocol",
        message: `javascript: protocol used in "${attribute.name}" within "${filePath}"`,
      });
    }
  }
}

function parseStartTag(html: string, index: number): ParsedStartTag | null {
  let cursor = index + 1;
  cursor = skipWhitespace(html, cursor);

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
): Result<string, GameZipAnalysisError> {
  if (!rawPath) {
    return dangerousZipEntry("ZIP entry path is empty");
  }

  const slashNormalizedPath = rawPath.replace(/\\/g, "/");
  if (
    slashNormalizedPath.startsWith("/") ||
    slashNormalizedPath.startsWith("//") ||
    /^[a-zA-Z]:\//.test(slashNormalizedPath)
  ) {
    return dangerousZipEntry(`ZIP entry path "${rawPath}" is not relative`);
  }

  const normalizedSegments: string[] = [];
  const rawSegments = slashNormalizedPath.split("/");

  for (const rawSegment of rawSegments) {
    if (rawSegment === "" || rawSegment === ".") {
      continue;
    }

    if (rawSegment === "..") {
      return dangerousZipEntry(`ZIP entry path "${rawPath}" escapes the root directory`);
    }

    normalizedSegments.push(rawSegment);
  }

  if (normalizedSegments.length === 0) {
    return dangerousZipEntry(`ZIP entry path "${rawPath}" is invalid`);
  }

  const normalizedPath = normalizedSegments.join("/");
  const directoryDepth = Math.max(0, normalizedSegments.length - (isDirectory ? 0 : 1));

  if (directoryDepth > limits.maxDirectoryDepth) {
    return {
      success: false,
      error: {
        code: "resource_limit_exceeded",
        file: normalizedPath,
        message: `ZIP entry "${normalizedPath}" exceeds the maximum directory depth (${limits.maxDirectoryDepth})`,
      },
    };
  }

  if (normalizedPath.length > limits.maxPathLength) {
    return {
      success: false,
      error: {
        code: "resource_limit_exceeded",
        file: normalizedPath,
        message: `ZIP entry path "${normalizedPath}" exceeds the maximum length (${limits.maxPathLength})`,
      },
    };
  }

  return {
    success: true,
    data: normalizedPath,
  };
}

function dangerousZipEntry(message: string): Result<string, GameZipAnalysisError> {
  return {
    success: false,
    error: {
      code: "dangerous_zip_entry",
      message,
    },
  };
}

function isHiddenOrSystemPath(filePath: string): boolean {
  return filePath.split("/").some((part) =>
    part.startsWith(".") || part === "__MACOSX" || part === "Thumbs.db"
  );
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
    message: "ZIP analysis exceeded the maximum processing time",
  };
}

function isTagNameCharacter(code: number): boolean {
  return code > 32 && code !== 47 && code !== 62;
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

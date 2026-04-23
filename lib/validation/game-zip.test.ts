import { describe, expect, test } from "bun:test";
import JSZip from "jszip";
import {
  checkModelWeightTotalSize,
  createModelWeightTotalTooLargeError,
  hasGameZipAnalysisError,
  inspectGameZip,
  MAX_MODEL_WEIGHT_TOTAL_BYTES,
} from "./game-zip";

async function buildZip(files: Record<string, Buffer | string>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  return Buffer.from(await zip.generateAsync({ type: "uint8array" }));
}

function fakeWeightBuffer(bytes: number): Buffer {
  // Incompressible random bytes so the ZIP does not silently deflate them to
  // nothing; we want realistic uncompressed size behavior in tests.
  const buf = Buffer.allocUnsafe(bytes);
  for (let i = 0; i < bytes; i++) buf[i] = Math.floor(Math.random() * 256);
  return buf;
}

describe("checkModelWeightTotalSize", () => {
  test("returns null when no weight files are present", () => {
    const result = checkModelWeightTotalSize([
      { path: "index.html", data: Buffer.from("<html></html>") },
      { path: "assets/logo.png", data: Buffer.alloc(1024) },
    ]);
    expect(result).toBeNull();
  });

  test("returns null when the cumulative size is under the limit", () => {
    const result = checkModelWeightTotalSize([
      { path: "a.pth", data: Buffer.alloc(50 * 1024 * 1024) },
      { path: "b.safetensors", data: Buffer.alloc(50 * 1024 * 1024) },
    ]);
    expect(result).toBeNull();
  });

  test("returns details when the cumulative size exceeds the limit", () => {
    const result = checkModelWeightTotalSize([
      { path: "a.pth", data: Buffer.alloc(120 * 1024 * 1024) },
      { path: "b.safetensors", data: Buffer.alloc(120 * 1024 * 1024) },
    ]);
    expect(result).not.toBeNull();
    expect(result!.totalBytes).toBe(240 * 1024 * 1024);
    expect(result!.limitBytes).toBe(MAX_MODEL_WEIGHT_TOTAL_BYTES);
    expect(result!.files.map((f) => f.path).sort()).toEqual([
      "a.pth",
      "b.safetensors",
    ]);
  });

  test("respects a custom limit parameter", () => {
    const result = checkModelWeightTotalSize(
      [{ path: "a.pth", data: Buffer.alloc(10 * 1024 * 1024) }],
      1 * 1024 * 1024,
    );
    expect(result).not.toBeNull();
    expect(result!.totalBytes).toBe(10 * 1024 * 1024);
    expect(result!.limitBytes).toBe(1 * 1024 * 1024);
  });

  test("ignores non-weight files in the total", () => {
    const result = checkModelWeightTotalSize(
      [
        { path: "a.pth", data: Buffer.alloc(512) },
        { path: "huge-asset.bin.txt", data: Buffer.alloc(10 * 1024 * 1024) },
        { path: "b.html", data: Buffer.alloc(10 * 1024 * 1024) },
      ],
      1024,
    );
    expect(result).toBeNull();
  });
});

describe("createModelWeightTotalTooLargeError", () => {
  test("produces a structured error with the expected shape", () => {
    const err = createModelWeightTotalTooLargeError({
      totalBytes: 250 * 1024 * 1024,
      limitBytes: MAX_MODEL_WEIGHT_TOTAL_BYTES,
      files: [{ path: "a.pth", bytes: 250 * 1024 * 1024 }],
    });
    expect(err.passed).toBe(false);
    expect(err.error.code).toBe("model_weight_total_too_large");
    expect(err.error.modelWeightDetails?.totalBytes).toBe(250 * 1024 * 1024);
    expect(err.error.message).toContain("200.00MB");
    expect(err.error.message).toContain("250.00MB");
  });
});

describe("inspectGameZip with model weight files", () => {
  test("accepts zips whose weight files are under the 200 MB cap", async () => {
    const zipBytes = await buildZip({
      "index.html": "<!doctype html><html><body></body></html>",
      "weights/model.safetensors": fakeWeightBuffer(2 * 1024 * 1024),
      "weights/extra.pth": fakeWeightBuffer(1 * 1024 * 1024),
    });

    const result = await inspectGameZip(zipBytes, { requireRootIndexHtml: true });
    expect(hasGameZipAnalysisError(result)).toBe(false);
    expect(result.passed).toBe(true);
  });

  test("rejects zips whose combined weight size exceeds the limit", async () => {
    const over = MAX_MODEL_WEIGHT_TOTAL_BYTES + 8 * 1024 * 1024;
    const zipBytes = await buildZip({
      "index.html": "<!doctype html><html><body></body></html>",
      "weights/big.safetensors": fakeWeightBuffer(over),
    });

    const result = await inspectGameZip(zipBytes, { requireRootIndexHtml: true });
    expect(hasGameZipAnalysisError(result)).toBe(true);
    if (!hasGameZipAnalysisError(result)) return;

    expect(result.error.code).toBe("model_weight_total_too_large");
    expect(result.error.modelWeightDetails).toBeDefined();
    expect(result.error.modelWeightDetails!.totalBytes).toBeGreaterThanOrEqual(over);
    expect(result.error.modelWeightDetails!.limitBytes).toBe(MAX_MODEL_WEIGHT_TOTAL_BYTES);
    expect(
      result.error.modelWeightDetails!.files.some((f) =>
        f.path.endsWith("big.safetensors"),
      ),
    ).toBe(true);
  });

  test("runs the weight check before the HTML JS scan so oversized weights short-circuit", async () => {
    const over = MAX_MODEL_WEIGHT_TOTAL_BYTES + 1 * 1024 * 1024;
    const zipBytes = await buildZip({
      // HTML with an inline <script> would normally fail html_validation,
      // but we expect model_weight_total_too_large to fire first.
      "index.html": "<!doctype html><html><body><script>alert(1)</script></body></html>",
      "weights/over.pth": fakeWeightBuffer(over),
    });

    const result = await inspectGameZip(zipBytes, { requireRootIndexHtml: true });
    expect(hasGameZipAnalysisError(result)).toBe(true);
    if (!hasGameZipAnalysisError(result)) return;
    expect(result.error.code).toBe("model_weight_total_too_large");
  });

  test("sums sizes across multiple weight files to apply the cap", async () => {
    const half = MAX_MODEL_WEIGHT_TOTAL_BYTES / 2 + 4 * 1024 * 1024;
    const zipBytes = await buildZip({
      "index.html": "<!doctype html><html><body></body></html>",
      "weights/a.safetensors": fakeWeightBuffer(half),
      "weights/b.pth": fakeWeightBuffer(half),
    });

    const result = await inspectGameZip(zipBytes, { requireRootIndexHtml: true });
    expect(hasGameZipAnalysisError(result)).toBe(true);
    if (!hasGameZipAnalysisError(result)) return;
    expect(result.error.code).toBe("model_weight_total_too_large");
    expect(result.error.modelWeightDetails!.files).toHaveLength(2);
  });

  test("treats non-weight extensions as out of scope even if they are large", async () => {
    // A 210 MB asset that is not a weight file should not trip the check.
    const zipBytes = await buildZip({
      "index.html": "<!doctype html><html><body></body></html>",
      "assets/huge-texture.png": fakeWeightBuffer(
        MAX_MODEL_WEIGHT_TOTAL_BYTES + 8 * 1024 * 1024,
      ),
    });

    const result = await inspectGameZip(zipBytes, { requireRootIndexHtml: true });
    expect(hasGameZipAnalysisError(result)).toBe(false);
    expect(result.passed).toBe(true);
  });
});

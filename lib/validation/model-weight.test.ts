import { describe, expect, test } from "bun:test";
import {
  MAX_MODEL_WEIGHT_TOTAL_BYTES,
  MODEL_WEIGHT_EXTENSIONS,
  formatMegabytes,
  isModelWeightFile,
} from "./model-weight";

describe("isModelWeightFile", () => {
  test("matches every declared extension case-insensitively", () => {
    for (const ext of MODEL_WEIGHT_EXTENSIONS) {
      expect(isModelWeightFile(`weights${ext}`)).toBe(true);
      expect(isModelWeightFile(`WEIGHTS${ext.toUpperCase()}`)).toBe(true);
      expect(isModelWeightFile(`nested/dir/model${ext}`)).toBe(true);
    }
  });

  test("does not match non-weight files", () => {
    expect(isModelWeightFile("index.html")).toBe(false);
    expect(isModelWeightFile("game/assets/logo.png")).toBe(false);
    expect(isModelWeightFile("readme.md")).toBe(false);
    expect(isModelWeightFile("scripts/main.js")).toBe(false);
  });

  test("requires the suffix at the very end of the path", () => {
    expect(isModelWeightFile("model.pth.txt")).toBe(false);
    expect(isModelWeightFile("archive.safetensors.bak")).toBe(false);
  });

  test("handles extensions appearing inside directory names", () => {
    expect(isModelWeightFile(".pth/index.html")).toBe(false);
    expect(isModelWeightFile("safetensors/readme.md")).toBe(false);
  });
});

describe("MAX_MODEL_WEIGHT_TOTAL_BYTES", () => {
  test("equals 200 MB expressed in binary megabytes", () => {
    expect(MAX_MODEL_WEIGHT_TOTAL_BYTES).toBe(200 * 1024 * 1024);
  });
});

describe("formatMegabytes", () => {
  test("rounds to 2 decimal places with MB suffix", () => {
    expect(formatMegabytes(0)).toBe("0.00MB");
    expect(formatMegabytes(1024 * 1024)).toBe("1.00MB");
    expect(formatMegabytes(1.5 * 1024 * 1024)).toBe("1.50MB");
    expect(formatMegabytes(MAX_MODEL_WEIGHT_TOTAL_BYTES)).toBe("200.00MB");
  });
});

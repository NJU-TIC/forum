// Client-safe constants and helpers for game ZIP validation.
// Kept separate from lib/validation/game-zip.ts so the browser bundle does
// not pull in jszip / parse5 / terser.

export const ASSET_LIMIT_BYTES = 10 * 1024 * 1024;

export const MAX_MODEL_WEIGHT_TOTAL_BYTES = 200 * 1024 * 1024;

export const MODEL_WEIGHT_EXTENSIONS: readonly string[] = [
  ".pth",
  ".pt",
  ".safetensors",
  ".ckpt",
  ".bin",
  ".onnx",
  ".gguf",
  ".ggml",
  ".h5",
  ".hdf5",
  ".pb",
  ".tflite",
  ".msgpack",
  ".npz",
  ".pkl",
];

export function isModelWeightFile(path: string): boolean {
  const lower = path.toLowerCase();
  return MODEL_WEIGHT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

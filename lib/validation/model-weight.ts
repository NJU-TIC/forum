// Client-safe constants and helpers for AI model weight validation.
// Kept separate from lib/validation/game-zip.ts so the browser bundle does
// not pull in parse5 / the Node-only ZIP inspection pipeline.

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

export const MAX_MODEL_WEIGHT_TOTAL_BYTES = 200 * 1024 * 1024;

export function isModelWeightFile(path: string): boolean {
  const lower = path.toLowerCase();
  return MODEL_WEIGHT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

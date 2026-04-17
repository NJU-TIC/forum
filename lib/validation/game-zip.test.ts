import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";
import type { GameZipViolation } from "./game-zip";

type AnalyzeGameZip = typeof import("./game-zip").analyzeGameZip;
type InspectGameZip = typeof import("./game-zip").inspectGameZip;

const { analyzeGameZip, inspectGameZip } = await import(new URL("./game-zip.ts", import.meta.url).href) as {
  analyzeGameZip: AnalyzeGameZip;
  inspectGameZip: InspectGameZip;
};

test("passes valid HTML files and allowed script tags", async () => {
  const zipBytes = await createZip({
    "game/index.html": `
      <!doctype html>
      <html>
        <body>
          <script src="./app.js"></script>
          <script type="application/json">{ "level": 1 }</script>
          <script type="application/ld+json">{ "@context": "https://schema.org" }</script>
          <textarea><script>alert(1)</script></textarea>
          <pre>&lt;script&gt;console.log(1)&lt;/script&gt;</pre>
          <code>&lt;a href="javascript:alert(1)"&gt;</code>
        </body>
      </html>
    `,
    "game/app.js": "console.log('ok');",
  });

  const result = await analyzeGameZip(zipBytes);

  assert.equal(result.passed, true);
  assert.deepEqual(result.violations, []);
});

test("collects all violations across multiple HTML files without deduplication", async () => {
  const zipBytes = await createZip({
    "bundle/index.html": `
      <button onclick="play()" onload="boot()"></button>
      <a href=" javascript:alert(1) ">Play</a>
      <form action="java&#115;cript:boot()"></form>
      <script>console.log(1)</script>
      <script>console.log(2)</script>
    `,
    "bundle/pages/LEVEL.HTM": `
      <img SRC="&#x4A;ava&#x73;cript:render()">
      <div onMouseOver="hover()"></div>
    `,
  });

  const result = await analyzeGameZip(zipBytes);

  assert.equal(result.passed, false);
  assert.deepEqual(
    result.violations.map((violation: GameZipViolation) => ({
      file: violation.file,
      type: violation.type,
    })),
    [
      { file: "index.html", type: "inline_event_handler" },
      { file: "index.html", type: "inline_event_handler" },
      { file: "index.html", type: "javascript_protocol" },
      { file: "index.html", type: "javascript_protocol" },
      { file: "index.html", type: "inline_script" },
      { file: "index.html", type: "inline_script" },
      { file: "pages/LEVEL.HTM", type: "javascript_protocol" },
      { file: "pages/LEVEL.HTM", type: "inline_event_handler" },
    ],
  );
});

test("treats broken HTML as analyzable and still reports executable inline script", async () => {
  const zipBytes = await createZip({
    "index.html": "<div><script>const x = 1",
  });

  const result = await analyzeGameZip(zipBytes);

  assert.equal(result.passed, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0]?.type, "inline_script");
});

test("does not report empty event handlers or empty inline scripts", async () => {
  const zipBytes = await createZip({
    "index.html": `
      <button onclick=""></button>
      <button onfocus="  "></button>
      <script> </script>
    `,
  });

  const result = await analyzeGameZip(zipBytes);

  assert.equal(result.passed, true);
  assert.deepEqual(result.violations, []);
});

test("keeps scanning after malformed lone angle brackets and catches later scripts", async () => {
  const zipBytes = await createZip({
    "index.html": `
      <div>before</div>
      <
        <script>
          window.__LATE_INLINE__ = true;
        </script>
    `,
  });

  const result = await analyzeGameZip(zipBytes);

  assert.equal(result.passed, false);
  assert.deepEqual(
    result.violations.map((violation) => violation.type),
    ["inline_script"],
  );
});

test("fails safely on dangerous parent traversal paths", async () => {
  const zipBytes = await createZip({
    "index.html": "<html></html>",
    "../evil.html": "<script>alert(1)</script>",
  });

  const result = await inspectGameZip(zipBytes);

  assert.equal(result.passed, false);
  assert.ok(result.error);
  assert.equal(result.error.code, "dangerous_zip_entry");
});

test("fails safely on Windows and mixed-separator traversal paths", async () => {
  const zipBytes = await createZip({
    "index.html": "<html></html>",
    "nested\\..\\escape.html": "<html></html>",
    "safe/..\\evil.html": "<html></html>",
  });

  const result = await inspectGameZip(zipBytes);

  assert.equal(result.passed, false);
  assert.ok(result.error);
  assert.equal(result.error.code, "dangerous_zip_entry");
});

test("rejects excessive entry counts", async () => {
  const zipBytes = await createZip({
    "index.html": "<html></html>",
    "extra.html": "<html></html>",
  });

  const result = await inspectGameZip(zipBytes, {
    maxEntries: 1,
  });

  assert.equal(result.passed, false);
  assert.ok(result.error);
  assert.equal(result.error.code, "resource_limit_exceeded");
});

test("rejects excessive single-file and total uncompressed sizes", async () => {
  const largeHtml = `<html>${"a".repeat(40)}</html>`;
  const zipBytes = await createZip({
    "index.html": largeHtml,
    "pages/extra.html": largeHtml,
  });

  const singleFileResult = await inspectGameZip(zipBytes, {
    maxFileBytes: 16,
  });
  assert.equal(singleFileResult.passed, false);
  assert.ok(singleFileResult.error);
  assert.equal(singleFileResult.error.code, "resource_limit_exceeded");

  const totalSizeResult = await inspectGameZip(zipBytes, {
    maxTotalUncompressedBytes: 80,
    maxFileBytes: 1024,
  });
  assert.equal(totalSizeResult.passed, false);
  assert.ok(totalSizeResult.error);
  assert.equal(totalSizeResult.error.code, "resource_limit_exceeded");
});

test("rejects excessive directory depth and path length", async () => {
  const deepZipBytes = await createZip({
    "a/b/c/index.html": "<html></html>",
  });

  const deepResult = await inspectGameZip(deepZipBytes, {
    maxDirectoryDepth: 1,
  });
  assert.equal(deepResult.passed, false);
  assert.ok(deepResult.error);
  assert.equal(deepResult.error.code, "resource_limit_exceeded");

  const longPathZipBytes = await createZip({
    [`${"x".repeat(245)}.html`]: "<html></html>",
  });

  const longPathResult = await inspectGameZip(longPathZipBytes, {
    maxPathLength: 50,
  });
  assert.equal(longPathResult.passed, false);
  assert.ok(longPathResult.error);
  assert.equal(longPathResult.error.code, "resource_limit_exceeded");
});

test("returns a timeout error when analysis exceeds the configured deadline", async () => {
  const zipBytes = await createZip({
    "index.html": "<html></html>",
  });

  const result = await inspectGameZip(zipBytes, {
    maxProcessingMs: -1,
  });

  assert.equal(result.passed, false);
  assert.ok(result.error);
  assert.equal(result.error.code, "analysis_timeout");
});

test("requires root index.html after unwrapping a single top-level directory", async () => {
  const zipBytes = await createZip({
    "game/pages/start.html": "<html></html>",
  });

  const analysisResult = await inspectGameZip(zipBytes);
  assert.equal(analysisResult.passed, true);

  const result = await inspectGameZip(zipBytes, {
    requireRootIndexHtml: true,
  });

  assert.equal(result.passed, false);
  assert.ok(result.error);
  assert.equal(result.error.code, "missing_index_html");
});

test("accepts mixed-case root index names when root index is required", async () => {
  const zipBytes = await createZip({
    "INDEX.HTML": "<html></html>",
  });

  const result = await inspectGameZip(zipBytes, {
    requireRootIndexHtml: true,
  });

  assert.equal(result.passed, true);
});

test("default limits reject resource exhaustion style ZIPs", async () => {
  const files: Record<string, string> = {
    "index.html": "<html></html>",
  };

  for (let i = 1; i <= 501; i += 1) {
    files[`spam/${String(i).padStart(4, "0")}.html`] = "<html></html>";
  }

  const zipBytes = await createZip(files);
  const result = await inspectGameZip(zipBytes);

  assert.equal(result.passed, false);
  assert.ok(result.error);
  assert.equal(result.error.code, "resource_limit_exceeded");
});

async function createZip(files: Record<string, string>): Promise<Uint8Array> {
  const zip = new JSZip();

  for (const [filePath, contents] of Object.entries(files)) {
    zip.file(filePath, contents);
  }

  return zip.generateAsync({
    type: "uint8array",
  });
}

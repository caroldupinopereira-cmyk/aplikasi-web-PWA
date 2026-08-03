import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("incoming letter create does not read an undefined id before inserting", async () => {
  const source = await readFile(
    new URL("../app/api/incoming-letters/route.ts", import.meta.url),
    "utf8",
  );
  const postHandler = source.slice(
    source.indexOf("export async function POST"),
    source.indexOf("export async function PATCH"),
  );
  assert.doesNotMatch(
    postHandler,
    /incomingLetters\.id,\s*id/,
  );

  const patchHandler = source.slice(
    source.indexOf("export async function PATCH"),
    source.indexOf("export async function DELETE"),
  );
  assert.match(
    patchHandler,
    /const \[before\][\s\S]*incomingLetters\.id,\s*id/,
  );
});

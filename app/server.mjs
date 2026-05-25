#!/usr/bin/env node

import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_CONFIG,
  PrecomputedGuideClient,
  SavantClient,
  evaluateRecommendation,
  generateGuideArtifacts,
  generateGuidePageHtml,
} from "./model.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const guideDataPath = path.join(__dirname, "data", "guide-winexp.json");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
const savantClient = new SavantClient();
const guideArtifactCache = new Map();
const guideArtifactCacheLimit = 12;
let guideClient = savantClient;

try {
  const guideData = JSON.parse(await readFile(guideDataPath, "utf8"));
  guideClient = new PrecomputedGuideClient(guideData, savantClient);
} catch {
  guideClient = savantClient;
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function stableStringify(value) {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${stableStringify(value[key])}`
  )).join(",")}}`;
}

function guideCacheKey(config, options, formats, renderOptions = {}) {
  return stableStringify({ config, options, formats: [...formats].sort(), renderOptions });
}

async function cachedGuideArtifacts(config, options, formats, renderOptions = {}) {
  const key = guideCacheKey(config, options, formats, renderOptions);
  if (guideArtifactCache.has(key)) {
    const cached = guideArtifactCache.get(key);
    guideArtifactCache.delete(key);
    guideArtifactCache.set(key, cached);
    return cached;
  }

  const pending = generateGuideArtifacts(guideClient, config, options, formats, renderOptions);
  guideArtifactCache.set(key, pending);
  if (guideArtifactCache.size > guideArtifactCacheLimit) {
    guideArtifactCache.delete(guideArtifactCache.keys().next().value);
  }

  try {
    const artifacts = await pending;
    guideArtifactCache.set(key, artifacts);
    return artifacts;
  } catch (error) {
    guideArtifactCache.delete(key);
    throw error;
  }
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function sendText(response, status, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) {
      throw new Error("Request body is too large.");
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function serveStatic(response, pathname) {
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const decodedPath = decodeURIComponent(normalizedPath);
  const filePath = path.normalize(path.join(publicDir, decodedPath));

  if (!filePath.startsWith(publicDir)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    const ext = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendText(response, 404, "Not found");
      return;
    }
    throw error;
  }
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      savantRequests: savantClient.requests,
      guideCacheSize: guideArtifactCache.size,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/config") {
    sendJson(response, 200, DEFAULT_CONFIG);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/recommend") {
    const body = await readJson(request);
    const result = await evaluateRecommendation(savantClient, body);
    sendJson(response, 200, result);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/guide") {
    const body = await readJson(request);
    const config = body.config || {};
    const options = body.options || {};
    const requestedFormats = Array.isArray(body.formats)
      ? body.formats.filter((format) => ["markdown", "html", "csv"].includes(format))
      : ["markdown", "html", "csv"];
    const artifacts = await cachedGuideArtifacts(config, options, requestedFormats);
    sendJson(response, 200, artifacts);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/guide-html") {
    const body = await readJson(request);
    const artifacts = await cachedGuideArtifacts(body.config || {}, body.options || {}, ["html"], { lazy: true });
    sendText(response, 200, artifacts.html || "", "text/html; charset=utf-8");
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/guide-print-html") {
    const body = await readJson(request);
    const artifacts = await cachedGuideArtifacts(body.config || {}, body.options || {}, ["html"], { lazy: false });
    sendText(response, 200, artifacts.html || "", "text/html; charset=utf-8");
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/guide-page-html") {
    const body = await readJson(request);
    const html = await generateGuidePageHtml(guideClient, body.config || {}, body.options || {}, body.page || {});
    sendText(response, 200, html, "text/html; charset=utf-8");
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/guide-csv") {
    const body = await readJson(request);
    const artifacts = await cachedGuideArtifacts(body.config || {}, body.options || {}, ["csv"]);
    sendText(response, 200, artifacts.csv || "", "text/csv; charset=utf-8");
    return;
  }

  sendJson(response, 404, { error: "Unknown API route." });
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  Promise.resolve()
    .then(async () => {
      if (url.pathname.startsWith("/api/")) {
        await handleApi(request, response, url);
        return;
      }
      await serveStatic(response, url.pathname);
    })
    .catch((error) => {
      const status = error instanceof SyntaxError ? 400 : 500;
      sendJson(response, status, { error: error.message || "Unexpected server error." });
    });
});

server.listen(port, host, () => {
  console.log(`ABS Challenge Desk running at http://${host}:${port}`);
});

import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd());
const port = Number(process.env.PORT ?? 3000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".data": "application/octet-stream",
  ".tflite": "application/octet-stream",
  ".binarypb": "application/octet-stream",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const withoutLeading = decoded.replace(/^\/+/, "");
  const candidate = normalize(join(root, withoutLeading));
  return candidate.startsWith(root) ? candidate : null;
}

const server = http.createServer((request, response) => {
  const url = request.url ?? "/";
  let filePath = safePath(url);
  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }
  if (!existsSync(filePath)) {
    filePath = join(root, "index.html");
  }
  const type = MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";
  const headers = {
    "Content-Type": type,
    "Cache-Control": filePath.endsWith("sw.js") ? "no-cache" : "no-cache",
    "Service-Worker-Allowed": "/",
    "Permissions-Policy": "camera=(self), microphone=(self)",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; font-src 'self'; object-src 'none'; base-uri 'self'",
  };
  response.writeHead(200, headers);
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Glipter running at http://localhost:${port}`);
  console.log("Camera requires localhost or HTTPS. Press Ctrl+C to stop.");
});

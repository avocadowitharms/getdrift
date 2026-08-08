import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { root } from "./blog-utils.mjs";

const port = Number(process.env.PORT || 5500);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${port}`);
    let filePath = path.join(root, decodeURIComponent(url.pathname));
    const details = await stat(filePath).catch(() => null);
    if (details?.isDirectory()) filePath = path.join(filePath, "index.html");
    if (!filePath.startsWith(root)) throw new Error("Invalid path");
    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, () => {
  console.log(`Drift preview ready at http://localhost:${port}/`);
});

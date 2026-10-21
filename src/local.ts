import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { handleMcpRequest } from "./http.js";

const assets: Record<string, [string, string]> = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/demo.html": ["demo.html", "text/html; charset=utf-8"],
  "/demo.js": ["demo.js", "text/javascript; charset=utf-8"],
  "/demo.css": ["demo.css", "text/css; charset=utf-8"],
};

export function createLocalServer() {
  return createServer(async (req, res) => {
    try {
      const origin = `http://127.0.0.1:${req.socket.localPort}`;
      const path = new URL(req.url ?? "/", origin).pathname;
      if (assets[path] && (req.method === "GET" || req.method === "HEAD")) {
        const [file, contentType] = assets[path];
        const content = await readFile(new URL(`../public/${file}`, import.meta.url));
        res.writeHead(200, { "content-type": contentType, "x-content-type-options": "nosniff" });
        res.end(req.method === "HEAD" ? undefined : content);
        return;
      }
      if (path !== "/mcp") {
        res.writeHead(404).end("Not found.");
        return;
      }
      const body = req.method === "GET" || req.method === "HEAD" ? undefined : Readable.toWeb(req);
      const request = new Request(`${origin}/mcp`, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body,
        duplex: "half",
      } as RequestInit);
      const response = await handleMcpRequest(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) Readable.fromWeb(response.body as never).pipe(res);
      else res.end();
    } catch {
      if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain" });
      res.end("The local server could not complete the request.");
    }
  });
}

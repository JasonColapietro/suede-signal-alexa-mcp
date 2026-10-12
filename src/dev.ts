// Local server for MCP Inspector and manual testing: npm run dev -> http://localhost:3333/mcp
import { createServer as createHttpServer } from "node:http";
import { Readable } from "node:stream";
import { handleMcpRequest } from "./http.js";

const port = Number(process.env.PORT ?? 3333);

createHttpServer(async (req, res) => {
  if (!req.url?.startsWith("/mcp")) {
    res.writeHead(404).end("Not found. The MCP endpoint is /mcp.");
    return;
  }
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : (Readable.toWeb(req) as ReadableStream);
  const request = new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body,
    duplex: "half",
  } as RequestInit);
  const response = await handleMcpRequest(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (response.body) Readable.fromWeb(response.body as never).pipe(res);
  else res.end();
}).listen(port, () => console.log(`Suede Signal MCP listening on http://localhost:${port}/mcp`));

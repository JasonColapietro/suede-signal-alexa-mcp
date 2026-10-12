// Vercel function: https://<host>/mcp (rewritten from /api/mcp in vercel.json).
import { handleMcpRequest } from "../src/http.js";

export const config = { maxDuration: 60 };

export function GET(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}

export function POST(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}

export function DELETE(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}

import type { IncomingMessage, ServerResponse } from 'node:http';

function createResponseHelpers(allowedOrigins: Set<string>) {
  function buildCorsHeaders(origin: string | undefined): Record<string, string> {
    if (!origin || !allowedOrigins.has(origin)) {
      return {};
    }

    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
  }

  function sendJson(
    response: ServerResponse,
    statusCode: number,
    payload: unknown,
    origin?: string,
  ): void {
    response.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      ...buildCorsHeaders(origin),
    });
    response.end(JSON.stringify(payload));
  }

  function sendText(response: ServerResponse, statusCode: number, payload: string): void {
    response.writeHead(statusCode, {
      'Content-Type': 'text/plain; charset=utf-8',
    });
    response.end(payload);
  }

  function sendCorsPreflight(response: ServerResponse, origin?: string): void {
    response.writeHead(204, {
      ...buildCorsHeaders(origin),
      'Access-Control-Max-Age': '86400',
    });
    response.end();
  }

  return {
    buildCorsHeaders,
    sendJson,
    sendText,
    sendCorsPreflight,
  };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }

  if (chunks.length === 0) {
    return null;
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as unknown) : null;
}

export { createResponseHelpers, readJsonBody };

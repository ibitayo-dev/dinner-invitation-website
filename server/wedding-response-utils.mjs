function createResponseHelpers(allowedOrigins) {
  function buildCorsHeaders(origin) {
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

  function sendJson(response, statusCode, payload, origin) {
    response.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      ...buildCorsHeaders(origin),
    });
    response.end(JSON.stringify(payload));
  }

  function sendText(response, statusCode, payload) {
    response.writeHead(statusCode, {
      'Content-Type': 'text/plain; charset=utf-8',
    });
    response.end(payload);
  }

  function sendCorsPreflight(response, origin) {
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

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return null;
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : null;
}

export { createResponseHelpers, readJsonBody };

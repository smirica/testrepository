const http = require('http');

const port = Number.parseInt(process.env.PORT || '3000', 10);
const serviceName = process.env.SERVICE_NAME || 'reading-gator-containerapp';
const version = process.env.SERVICE_VERSION || '0.1.0';

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body, null, 2);

  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendText(res, statusCode, body) {
  res.writeHead(statusCode, {
    'content-type': 'text/plain; charset=utf-8',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, {
      ok: true,
      service: serviceName,
      version,
      status: 'healthy',
      runtime: 'node',
      port,
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/status') {
    return sendJson(res, 200, {
      ok: true,
      service: serviceName,
      version,
      message: 'Container service scaffold is running.',
      capabilities: [
        'agent-orchestration',
        'tool-calls',
        'workflow-routing',
        'document-review',
      ],
    });
  }

  if (req.method === 'GET' && url.pathname === '/') {
    return sendText(
      res,
      200,
      `${serviceName} is running on port ${port}. Use /health or /api/status.`
    );
  }

  sendJson(res, 404, {
    ok: false,
    error: 'Not found',
    path: url.pathname,
  });
});

server.listen(port, () => {
  console.log(`${serviceName} listening on port ${port}`);
});

// shortcut: minimal local-only stand-in for `vercel dev`, not part of the deployable app.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const analyze = require('./api/analyze');

const PORT = 3000;

http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);

  if (parsed.pathname === '/api/analyze') {
    const query = Object.fromEntries(parsed.searchParams);
    await analyze({ method: 'GET', query }, {
      status(code) { res.statusCode = code; return this; },
      json(body) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(body));
      },
    });
    return;
  }

  const filePath = parsed.pathname === '/' ? 'index.html' : parsed.pathname.slice(1);
  fs.readFile(path.join(__dirname, filePath), (err, data) => {
    if (err) { res.statusCode = 404; res.end('Not found'); return; }
    res.setHeader('Content-Type', filePath.endsWith('.html') ? 'text/html' : 'text/plain');
    res.end(data);
  });
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));

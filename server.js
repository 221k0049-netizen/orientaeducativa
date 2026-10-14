/* ============================================================
   NAIMA OS · CONALEP Mérida I — Servidor Local de Desarrollo
   Soporte para archivos estáticos y API /api/send-email
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const sendEmailHandler = require('./api/send-email.js');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.sql': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

const server = http.createServer((req, res) => {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. Manejo de endpoint serverless: /api/send-email
  if (pathname === '/api/send-email') {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', async () => {
      try {
        req.body = bodyData ? JSON.parse(bodyData) : {};
      } catch (err) {
        req.body = {};
      }

      res.status = function(code) {
        this.statusCode = code;
        return this;
      };

      res.json = function(data) {
        this.setHeader('Content-Type', 'application/json; charset=utf-8');
        return this.end(JSON.stringify(data));
      };

      try {
        await sendEmailHandler(req, res);
      } catch (handlerErr) {
        console.error('Error en api/send-email handler:', handlerErr);
        if (!res.writableEnded) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: handlerErr.message }));
        }
      }
    });
    return;
  }

  // 2. Manejo de archivos estáticos
  if (pathname === '/') pathname = '/index.html';
  let filePath = path.join(__dirname, pathname);

  // Soporte para URLs limpias (cleanUrls tipo Vercel: /admin -> /admin.html)
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Recurso No Encontrado');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`🚀 NAIMA OS Servidor iniciado en: http://localhost:${PORT}/`);
  console.log(`👉 Acceso: http://localhost:${PORT}/index.html`);
  console.log(`👉 Admin: http://localhost:${PORT}/admin.html`);
  console.log(`👉 Alumno: http://localhost:${PORT}/estudiante.html`);
});

'use strict';

require('dotenv').config();

const http = require('http');
const express = require('express');
const config = require('./config');
const { startBot } = require('./lib/connection');
const { registerHandler } = require('./lib/handler');

// ─── Platform Detection (Jarvis-style) ───────────────────────────────────────
global.platform =
  process.env.KOYEB_APP_ID    ? 'KOYEB'       :
  process.env.RENDER          ? 'RENDER'       :
  process.env.RAILWAY_SERVICE_NAME ? 'RAILWAY' :
  process.env.HEROKU_APP_NAME ? 'HEROKU'       :
  process.env.DYNO            ? 'HEROKU'       :
  process.env.VERCEL          ? 'VERCEL'       :
  process.env.FLY_APP_NAME    ? 'FLY_IO'       :
  process.env.GITHUB_ACTIONS  ? 'GITHUB'       :
  process.env.TERMUX_VERSION  ? 'TERMUX'       :
  process.env.REPLIT_USER     ? 'REPLIT'       :
  'LOCAL';

console.log(`[Sawyer] Starting on platform: ${global.platform}`);

// ─── Global Error Handlers (prevents crash on unhandled errors) ──────────────
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason?.stack || reason);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err?.stack || err);
});

// ─── HTTP Keep-Alive Server ───────────────────────────────────────────────────
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <h2>🤖 ${config.BOT_NAME} is Running</h2>
    <p>Platform: ${global.platform}</p>
    <p>Prefix: <code>${config.PREFIX}</code></p>
    <p>Owner: ${config.OWNER_NAME}</p>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', platform: global.platform, bot: config.BOT_NAME });
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`[Sawyer] HTTP server listening on port ${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`[Sawyer] Port ${port} busy, trying ${port + 1}...`);
      startServer(port + 1);
      return;
    }
    throw error;
  });

  return server;
}

// ─── Self-Ping (keeps Render/Koyeb free tier alive) ──────────────────────────
let _serverUrl = null;

function startSelfPing(url) {
  _serverUrl = url;
  setInterval(() => {
    if (!_serverUrl) return;
    http.get(_serverUrl, (res) => {
      console.log(`[Sawyer] Keep-alive ping → ${res.statusCode}`);
    }).on('error', (err) => {
      console.error('[Sawyer] Keep-alive ping failed:', err.message);
    });
  }, 5 * 60 * 1000); // every 5 minutes
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const server = startServer(config.PORT);

// Determine the URL to self-ping
server.on('listening', () => {
  const addr = server.address();
  const port = addr?.port || config.PORT;

  // On Render/Koyeb the external URL is set via env; fallback to localhost
  const externalUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.KOYEB_PUBLIC_DOMAIN && `https://${process.env.KOYEB_PUBLIC_DOMAIN}` ||
    `http://localhost:${port}`;

  startSelfPing(externalUrl);
});

(async () => {
  await startBot((sock) => {
    registerHandler(sock);
  });
})();

const { default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// ─── Session Path Resolution ──────────────────────────────────────────────────
const envSessionDir = config.SESSION_DIR?.trim();
const sessionId = config.SESSION_ID?.trim();

const SESSION_DIR = envSessionDir
  ? envSessionDir
  : sessionId
    ? path.join(__dirname, '..', `session_${sessionId}`)
    : path.join(__dirname, '..', 'session');

const AUTH_STATE_PATH = path.join(SESSION_DIR, 'auth_info_baileys');

// ─── Ensure Required Directories Exist ───────────────────────────────────────
for (const dir of [SESSION_DIR, AUTH_STATE_PATH, path.join(__dirname, '..', 'data')]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ─── State ────────────────────────────────────────────────────────────────────
let reconnectTimer = null;
let reconnecting = false;
let authResetAttempted = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function resetAuthSession() {
  if (fs.existsSync(AUTH_STATE_PATH)) {
    fs.rmSync(AUTH_STATE_PATH, { recursive: true, force: true });
  }
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
  console.log('[Sawyer] Auth session reset — will start fresh.');
}

function getDisconnectReason(lastDisconnect) {
  const statusCode = lastDisconnect?.error?.output?.statusCode;
  const reasonText = lastDisconnect?.error?.output?.payload?.message || 'unknown';
  return { statusCode, reasonText };
}

// ─── Main Bot Start ───────────────────────────────────────────────────────────
async function startBot(onConnected) {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_STATE_PATH);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Chrome'),
    auth: state,
    printQRInTerminal: true,  // single QR print — no manual qr.generate needed
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 25_000,
    emitOwnEvents: false,
    syncFullHistory: false,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr: qrCode } = update;

    if (update?.creds?.me?.id) {
      sock.user = update.creds.me;
    }

    if (qrCode) {
      console.log('[Sawyer] QR code generated — scan with WhatsApp to connect.');
    }

    if (connection === 'close') {
      const { statusCode, reasonText } = getDisconnectReason(lastDisconnect);
      const isConflict =
        reasonText.includes('conflict') ||
        statusCode === DisconnectReason.connectionReplaced;
      const isConnectionFailure =
        reasonText.includes('Connection Failure') ||
        reasonText.includes('connection failure') ||
        reasonText.includes('timed out');
      const shouldReconnect =
        !isConflict &&
        statusCode !== DisconnectReason.loggedOut &&
        statusCode !== DisconnectReason.badSession;

      console.log(`[Sawyer] Connection closed: ${reasonText} (code: ${statusCode}). Will reconnect: ${shouldReconnect}`);

      if (isConflict) {
        console.log('[Sawyer] Session conflict — close the other active session and restart.');
        return;
      }

      if (!authResetAttempted && (isConnectionFailure || statusCode === DisconnectReason.badSession)) {
        authResetAttempted = true;
        resetAuthSession();
        setTimeout(() => {
          startBot(onConnected).catch((err) => console.error('[Sawyer] Retry after reset failed:', err));
        }, 3000);
        return;
      }

      if (shouldReconnect && !reconnecting) {
        reconnecting = true;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          reconnecting = false;
          startBot(onConnected).catch((err) => console.error('[Sawyer] Reconnect failed:', err));
        }, 5000);
      }
    }

    if (connection === 'open') {
      reconnecting = false;
      authResetAttempted = false;
      console.log(`[Sawyer] ✅ Bot connected! User: ${sock.user?.id || 'unknown'}`);

      if (typeof onConnected === 'function') {
        onConnected(sock);
      }

      // Notify owner on startup
      try {
        const ownerJid = `${config.OWNER_NUMBER}@s.whatsapp.net`;
        const platform = global.platform || 'LOCAL';
        await sock.sendMessage(ownerJid, {
          text: `✅ *${config.BOT_NAME}* is online!\n\n🖥️ Platform: ${platform}\n🔑 Prefix: ${config.PREFIX}\n📋 Session: ${config.SESSION_ID || 'local'}`,
        });
      } catch (err) {
        console.error('[Sawyer] Failed to send startup message:', err.message);
      }
    }
  });

  // ✅ FIXED: saveCreds() takes NO arguments
  sock.ev.on('creds.update', () => {
    saveCreds();
  });

  return sock;
}

module.exports = { startBot, SESSION_DIR };

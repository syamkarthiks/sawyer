const fs   = require('fs');
const path = require('path');
const config = require('../config');
const { sendText } = require('../lib/send');

const MODE_FILE = path.join(__dirname, '..', 'data', 'mode.json');

/** Persist mode to disk so it survives restarts */
function saveMode(mode) {
  try {
    const dir = path.dirname(MODE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MODE_FILE, JSON.stringify({ mode }), 'utf8');
  } catch (err) {
    console.error('[mode] Failed to save mode:', err.message);
  }
}

/** Load persisted mode from disk (falls back to config) */
function loadMode() {
  try {
    if (fs.existsSync(MODE_FILE)) {
      const { mode } = JSON.parse(fs.readFileSync(MODE_FILE, 'utf8'));
      return mode || config.MODE || 'public';
    }
  } catch {}
  return config.MODE || 'public';
}

/**
 * .mode public  — bot responds to everyone
 * .mode private — bot responds only to owner + sudo users
 */
async function modeCommand(sock, from, args, botState) {
  const value = (args[0] || '').toLowerCase();

  if (!['public', 'private'].includes(value)) {
    const current = botState.mode === 'private' ? '🔒 PRIVATE' : '🌐 PUBLIC';
    await sendText(sock, from, `🔘 *Bot Mode* is currently *${current}*\n\nUsage:\n*.mode public* — respond to everyone\n*.mode private* — respond only to owner & sudo`);
    return;
  }

  botState.mode = value;
  saveMode(value);

  if (value === 'private') {
    await sendText(sock, from, '🔒 *Mode set to PRIVATE*\nBot will only respond to owner and sudo users.');
  } else {
    await sendText(sock, from, '🌐 *Mode set to PUBLIC*\nBot will respond to everyone.');
  }
}

module.exports = { modeCommand, loadMode };

const { sendText } = require('../lib/send');

/**
 * .antidelete on/off
 * When ON: deleted messages are forwarded to the owner DM with
 * sender, group name, date, and time.
 *
 * The actual deletion detection lives in handler.js (messages.delete event).
 * This command just toggles the state.enabled flag.
 */
async function antideleteCommand(sock, from, args, state) {
  const value = (args[0] || '').toLowerCase();

  if (!['on', 'off'].includes(value)) {
    const current = state.enabled ? '🟢 ON' : '🔴 OFF';
    await sendText(sock, from, `🔔 *Anti-Delete* is currently *${current}*\n\nUsage: *.antidelete on* or *.antidelete off*`);
    return;
  }

  state.enabled = value === 'on';

  if (state.enabled) {
    await sendText(sock, from, '✅ *Anti-Delete is ON*\nDeleted messages will be sent to owner DM with sender, group, date & time.');
  } else {
    await sendText(sock, from, '🔕 *Anti-Delete is OFF*');
  }
}

module.exports = { antideleteCommand };
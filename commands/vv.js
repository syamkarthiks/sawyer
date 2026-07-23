const config = require('../config');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { sendText } = require('../lib/send');

function getMediaInfo(message) {
  if (!message?.message) return null;
  const m = message.message;

  if (m.imageMessage)    return { key: 'image',    mimetype: m.imageMessage.mimetype    || 'image/jpeg' };
  if (m.videoMessage)    return { key: 'video',    mimetype: m.videoMessage.mimetype    || 'video/mp4'  };
  if (m.audioMessage)    return { key: 'audio',    mimetype: m.audioMessage.mimetype    || 'audio/ogg', ptt: !!m.audioMessage.ptt };
  if (m.documentMessage) return { key: 'document', mimetype: m.documentMessage.mimetype || 'application/octet-stream' };
  if (m.stickerMessage)  return { key: 'sticker',  mimetype: m.stickerMessage.mimetype  || 'image/webp' };
  return null;
}

/**
 * .vv  — forwards once-view media to the owner's DM.
 * Usage: reply to a once-view/media message with .vv
 */
async function vvCommand(sock, from, mediaStore, msg) {
  const ownerJid = `${config.OWNER_NUMBER}@s.whatsapp.net`;

  // Check quoted reply first, then last cached media in this chat
  let source = null;
  const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted) {
    source = { message: quoted, key: msg.key };
  } else {
    source = mediaStore.get(from)?.message || null;
  }

  if (!source) {
    await sendText(sock, from, '❌ No media found. Reply to a photo/video/voice with *.vv*');
    return;
  }

  const mediaInfo = getMediaInfo(source);
  if (!mediaInfo) {
    await sendText(sock, from, '❌ That message has no downloadable media.');
    return;
  }

  try {
    const buffer = await downloadMediaMessage(source, 'buffer', {});
    if (!buffer || buffer.length === 0) {
      await sendText(sock, from, '❌ Could not download that media. It may have expired.');
      return;
    }

    const isGroup  = from.endsWith('@g.us');
    const sender   = msg.key?.participant || msg.key?.remoteJid || from;
    const senderNo = sender.split('@')[0];
    const chatLabel = isGroup ? `Group: ${from.split('@')[0]}` : 'DM';

    const payload = {
      [mediaInfo.key]: buffer,
      mimetype: mediaInfo.mimetype,
      caption: `📩 *VV Request*\nFrom: +${senderNo}\nChat: ${chatLabel}`,
    };
    if (mediaInfo.ptt !== undefined) payload.ptt = mediaInfo.ptt;

    await sock.sendMessage(ownerJid, payload);
    await sendText(sock, from, '✅ Sent to owner DM.');
  } catch (err) {
    console.error('[vv] Error:', err);
    await sendText(sock, from, '❌ Failed to forward media. Try again.');
  }
}

module.exports = { vvCommand };

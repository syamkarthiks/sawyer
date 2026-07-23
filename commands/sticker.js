const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { sendText } = require('../lib/send');
const config = require('../config');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

/**
 * .sticker — converts an image or video to a WhatsApp sticker with custom metadata.
 * User must either:
 *   - send an image/video with caption ".sticker", OR
 *   - reply to an image/video with ".sticker"
 */
async function stickerCommand(sock, from, msg) {
  // Resolve the target message (quoted reply or current message)
  let targetMsg = msg;
  const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted) {
    targetMsg = { message: quoted, key: msg.key };
  }

  const msgContent = targetMsg?.message;
  if (!msgContent) {
    await sendText(sock, from, '❌ Reply to an image or video with *.sticker*');
    return;
  }

  const isImage  = !!msgContent.imageMessage;
  const isVideo  = !!msgContent.videoMessage;
  const isSticker = !!msgContent.stickerMessage;

  if (!isImage && !isVideo && !isSticker) {
    await sendText(sock, from, '❌ Reply to an *image* or *video* with *.sticker*');
    return;
  }

  try {
    await sendText(sock, from, '⏳ Creating sticker...');

    const buffer = await downloadMediaMessage(targetMsg, 'buffer', {});
    if (!buffer || buffer.length === 0) {
      await sendText(sock, from, '❌ Could not download that media. Try again.');
      return;
    }

    // Split config STICKER_NAME into pack name and author name
    const [pack, author] = (config.STICKER_NAME || 'syam; awyer').split(';');
    const stickerPack = pack ? pack.trim() : 'syam';
    const stickerAuthor = author ? author.trim() : 'awyer';

    const sticker = new Sticker(buffer, {
      pack: stickerPack,
      author: stickerAuthor,
      type: StickerTypes.FULL,
      quality: 70
    });

    const stickerBuffer = await sticker.toBuffer();
    await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
  } catch (err) {
    console.error('[sticker] Error:', err);
    await sendText(sock, from, '❌ Sticker creation failed. Make sure you replied to an image.');
  }
}

module.exports = { stickerCommand };

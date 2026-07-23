const config = require('../config');
const { sendText }          = require('./send');
const { menuCommand }       = require('../commands/menu');
const { pingCommand }       = require('../commands/ping');
const { stickerCommand }    = require('../commands/sticker');
const { vvCommand }         = require('../commands/vv');
const { antideleteCommand } = require('../commands/antidelete');
const { sudoCommand }       = require('../commands/sudo');
const { modeCommand, loadMode } = require('../commands/mode');
const { getSudoNumbers, normalizeJid } = require('./sudo');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMediaMessage(message) {
  if (!message) return null;
  let m = message;
  if (m.viewOnceMessage?.message) {
    m = m.viewOnceMessage.message;
  } else if (m.viewOnceMessageV2?.message) {
    m = m.viewOnceMessageV2.message;
  }
  return m;
}

function extractMessageText(msg) {
  if (!msg?.message) return '';
  const m = getMediaMessage(msg.message);
  if (!m) return '';
  return (
    m.conversation                                          ||
    m.extendedTextMessage?.text                            ||
    m.imageMessage?.caption                                ||
    m.videoMessage?.caption                                ||
    m.documentMessage?.caption                             ||
    m.buttonsResponseMessage?.selectedButtonId             ||
    m.templateButtonReplyMessage?.selectedId               ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  ).trim();
}

function isSudoOrOwner(jid, sock) {
  const norm = normalizeJid(jid);
  if (!norm) return false;

  const selfJid = sock?.user?.id || sock?.authState?.creds?.me?.id || '';
  const normSelf = normalizeJid(selfJid);
  if (normSelf && norm === normSelf) return true;

  const sudos = getSudoNumbers().map(normalizeJid);
  return norm === normalizeJid(config.OWNER_NUMBER) || sudos.includes(norm);
}

function isOwner(jid, sock) {
  const norm = normalizeJid(jid);
  if (!norm) return false;

  const selfJid = sock?.user?.id || sock?.authState?.creds?.me?.id || '';
  const normSelf = normalizeJid(selfJid);
  if (normSelf && norm === normSelf) return true;

  return norm === normalizeJid(config.OWNER_NUMBER);
}

function isAuthorized(jid, botState, sock) {
  if (botState.mode !== 'private') return true;
  return isSudoOrOwner(jid, sock);
}

/** Format a JS Date as  "20 Jul 2026, 04:55 PM IST" */
function formatDate(date) {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  }) + ' IST';
}

// ─── Register Handler ─────────────────────────────────────────────────────────

function registerHandler(sock) {
  if (sock.__handlerAttached) return;
  sock.__handlerAttached = true;

  // Shared runtime state (lives as long as this socket connection)
  const mediaStore      = new Map();     // jid → { message }
  const messageStore    = new Map();     // msgId → message (for anti-delete lookup)
  const antiDeleteState = { enabled: false };
  const botState      = { mode: loadMode() }; // persisted across restarts

  // ── 1. Message Handler ─────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        if (!msg?.message) continue;

        const from = msg.key?.remoteJid;
        if (!from) continue;

        const selfJid = sock?.user?.id || '';
        const sender = msg.key?.fromMe
          ? selfJid
          : (msg.key?.participant || msg.key?.remoteJid || '');

        // ── Anti-Delete Interception ─────────────────────────────────────────
        const proto = msg.message?.protocolMessage;
        const isRevoke = proto && (proto.type === 0 || proto.type === 'REVOKE' || proto.type === 'revoked');
        
        if (isRevoke) {
          if (antiDeleteState.enabled && !msg.key?.fromMe) {
            const deletedKey = proto.key;
            if (deletedKey) {
              const originalMsg = messageStore.get(deletedKey.id);
              const ownerJid = `${config.OWNER_NUMBER}@s.whatsapp.net`;
              const now = formatDate(new Date());
              const isGroup = from.endsWith('@g.us');
              
              const originalSender = originalMsg?.key?.participant || originalMsg?.key?.remoteJid || deletedKey.participant || sender;
              const senderNo = originalSender.split('@')[0].split(':')[0];

              let groupName = '';
              if (isGroup && sock.groupMetadata) {
                try {
                  const meta = await sock.groupMetadata(from);
                  groupName = meta?.subject || from.split('@')[0];
                } catch {
                  groupName = from.split('@')[0] || 'Unknown Group';
                }
              }

              const chatLabel = isGroup ? `👥 ${groupName}` : '💬 Private DM';
              let deletedContent = '';
              let hasMedia = false;
              let mediaKey = '';
              let mime = '';

              if (originalMsg) {
                const originalText = extractMessageText(originalMsg);
                if (originalText) {
                  deletedContent = originalText;
                } else if (originalMsg.message?.imageMessage) {
                  deletedContent = `🖼️ [Image] ${originalMsg.message.imageMessage.caption || ''}`;
                  hasMedia = true;
                  mediaKey = 'image';
                  mime = originalMsg.message.imageMessage.mimetype || 'image/jpeg';
                } else if (originalMsg.message?.videoMessage) {
                  deletedContent = `🎥 [Video] ${originalMsg.message.videoMessage.caption || ''}`;
                  hasMedia = true;
                  mediaKey = 'video';
                  mime = originalMsg.message.videoMessage.mimetype || 'video/mp4';
                } else if (originalMsg.message?.stickerMessage) {
                  deletedContent = '🎨 [Sticker]';
                  hasMedia = true;
                  mediaKey = 'sticker';
                  mime = originalMsg.message.stickerMessage.mimetype || 'image/webp';
                } else if (originalMsg.message?.audioMessage) {
                  deletedContent = '🎵 [Audio/Voice Note]';
                  hasMedia = true;
                  mediaKey = 'audio';
                  mime = originalMsg.message.audioMessage.mimetype || 'audio/ogg';
                } else if (originalMsg.message?.documentMessage) {
                  deletedContent = `📄 [Document] ${originalMsg.message.documentMessage.fileName || ''}`;
                  hasMedia = true;
                  mediaKey = 'document';
                  mime = originalMsg.message.documentMessage.mimetype || 'application/octet-stream';
                } else {
                  deletedContent = '*(media or unknown message type)*';
                }
              } else {
                deletedContent = proto.body || '*(message not found in cache)*';
              }

              const report = `🗑️ *Deleted Message Detected*

👤 Sender: +${senderNo}
📍 Chat: ${chatLabel}
🕐 Time: ${now}

💬 Content:
${deletedContent}`;

              if (originalMsg && hasMedia) {
                try {
                  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
                  const buffer = await downloadMediaMessage(originalMsg, 'buffer', {});
                  if (buffer && buffer.length > 0) {
                    if (mediaKey === 'audio') {
                      await sendText(sock, ownerJid, report);
                      await sock.sendMessage(ownerJid, { audio: buffer, mimetype: mime, ptt: !!originalMsg.message.audioMessage?.ptt });
                    } else if (mediaKey === 'sticker') {
                      await sendText(sock, ownerJid, report);
                      await sock.sendMessage(ownerJid, { sticker: buffer });
                    } else {
                      await sock.sendMessage(ownerJid, {
                        [mediaKey]: buffer,
                        mimetype: mime,
                        caption: report
                      });
                    }
                    continue;
                  }
                } catch (e) {
                  console.error('[antidelete] Failed to download media:', e.message);
                }
              }

              await sendText(sock, ownerJid, report);
            }
          }
          continue;
        }

        // Cache the incoming message in our sliding window store
        messageStore.set(msg.key.id, msg);
        if (messageStore.size > 1000) {
          const firstKey = messageStore.keys().next().value;
          messageStore.delete(firstKey);
        }

        const text    = extractMessageText(msg);
        const trimmed = text.trim();

        // Only respond to prefix commands
        const prefix = config.PREFIX;
        const isCmd = trimmed.startsWith(prefix) || trimmed.startsWith('!') || trimmed.startsWith('/');
        if (!isCmd) continue;

        // If fromMe (bot's own account), only process if it is a command
        if (msg.key?.fromMe && !isCmd) continue;

        // Cache any media messages for .vv
        const m = msg.message;
        if (m.imageMessage || m.videoMessage || m.audioMessage || m.documentMessage || m.stickerMessage) {
          mediaStore.set(from, { message: msg });
        }

        const usedPrefix  = trimmed.startsWith(prefix) ? prefix : trimmed[0];
        const commandText = trimmed.slice(usedPrefix.length).trim();
        const [command, ...args] = commandText.split(/\s+/).filter(Boolean);
        const cmd = (command || '').toLowerCase();

        if (!cmd) continue;

        // Authorization check
        if (!isAuthorized(sender, botState, sock)) continue;

        console.log(`[handler] ${formatDate(new Date())} | cmd: ${usedPrefix}${cmd} | from: ${sender}`);

        // ── Commands ──────────────────────────────────────────────────────────
        switch (cmd) {
          case 'menu':
            await menuCommand(sock, from, botState);
            break;

          case 'ping':
            await pingCommand(sock, from);
            break;

          case 'sticker':
          case 's':
            await stickerCommand(sock, from, msg);
            break;

          case 'vv':
            if (!isSudoOrOwner(sender, sock)) {
              await sendText(sock, from, '❌ Only the owner or sudo users can use this command.');
              break;
            }
            await vvCommand(sock, from, mediaStore, msg);
            break;

          case 'antidelete':
            if (!isOwner(sender, sock)) {
              const selfJid = sock?.user?.id || '';
              await sendText(sock, from, `❌ Only the owner can use this command.\n\n*Debug Info:*\n- Sender: \`${sender}\`\n- Self JID: \`${selfJid}\`\n- Config Owner: \`${config.OWNER_NUMBER}\`\n- Norm Sender: \`${normalizeJid(sender)}\`\n- Norm Owner: \`${normalizeJid(config.OWNER_NUMBER)}\``);
              break;
            }
            await antideleteCommand(sock, from, args, antiDeleteState);
            break;

          case 'mode':
            if (!isOwner(sender, sock)) {
              const selfJid = sock?.user?.id || '';
              await sendText(sock, from, `❌ Only the owner can use this command.\n\n*Debug Info:*\n- Sender: \`${sender}\`\n- Self JID: \`${selfJid}\`\n- Config Owner: \`${config.OWNER_NUMBER}\`\n- Norm Sender: \`${normalizeJid(sender)}\`\n- Norm Owner: \`${normalizeJid(config.OWNER_NUMBER)}\``);
              break;
            }
            await modeCommand(sock, from, args, botState);
            break;

          case 'sudo':
          case 'setsudo':
          case 'delsudo':
          case 'getsudo':
            await sudoCommand(sock, from, [cmd, ...args], msg);
            break;

          default:
            await sendText(sock, from, `❓ Unknown command. Send *${prefix}menu* to see all commands.`);
        }
      } catch (err) {
        console.error('[handler] Error processing message:', err);
      }
    }
  });
}

module.exports = { registerHandler, extractMessageText };

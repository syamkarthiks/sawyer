const config = require('../config');
const { addSudoNumber, removeSudoNumber, getSudoNumbers } = require('../lib/sudo');
const { sendText } = require('../lib/send');

function normalizeJid(jid) {
  if (!jid) return '';
  const raw = jid.toString();
  const clean = raw.split('@')[0].split(':')[0];
  return clean.replace(/[^0-9]/g, '');
}

async function sudoCommand(sock, from, args, msg) {
  if (!msg?.message) {
    await sendText(sock, from, 'Please use this command with a reply or provide a phone number.');
    return;
  }

  const selfJid = sock?.user?.id || '';
  const sender = msg.key?.fromMe
    ? selfJid
    : (msg.key?.participant || msg.key?.remoteJid || '');

  const normSender = normalizeJid(sender);
  const normOwner = normalizeJid(config.OWNER_NUMBER);
  const normSelf = normalizeJid(selfJid);

  const isOwner = normSender === normOwner || (normSelf && normSender === normSelf);
  if (!isOwner) {
    await sendText(sock, from, 'Only the owner can manage sudo users.');
    return;
  }

  const action = (args[0] || '').toLowerCase();
  const targetNumber = args[1] || '';

  if (!action || !['setsudo', 'delsudo', 'getsudo'].includes(action)) {
    await sendText(sock, from, 'Usage:\n.setsudo <number>\n.delsudo <number>\n.getsudo');
    return;
  }

  if (action === 'getsudo') {
    await sendText(sock, from, `Current sudo numbers:\n${getSudoNumbers().join('\n')}`);
    return;
  }

  let numberToUse = targetNumber;
  if (!numberToUse) {
    const quoted = msg.message.extendedTextMessage?.contextInfo?.participant;
    if (quoted) {
      numberToUse = quoted;
    }
  }

  if (!numberToUse) {
    await sendText(sock, from, 'Provide a number or reply to a message.');
    return;
  }

  if (action === 'setsudo') {
    const result = addSudoNumber(numberToUse);
    await sendText(sock, from, result.message);
  } else {
    const result = removeSudoNumber(numberToUse);
    await sendText(sock, from, result.message);
  }
}

module.exports = { sudoCommand };

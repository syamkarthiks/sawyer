async function sendText(sock, jid, text) {
  if (!sock || !jid || !text) return false;

  const candidates = [
    jid,
    jid.toString().replace(/@lid$/i, '@s.whatsapp.net'),
    jid.toString().replace(/@s\.whatsapp\.net$/i, '@lid')
  ].filter(Boolean);

  let lastError;
  for (const target of candidates) {
    try {
      await sock.sendMessage(target, { text });
      return true;
    } catch (error) {
      lastError = error;
      console.error('Send failed for target', target, error);
    }
  }

  console.error('All send attempts failed for', jid, lastError);
  return false;
}

module.exports = { sendText };

const { sendText } = require('../lib/send');

async function pingCommand(sock, from) {
  const start = Date.now();
  await sendText(sock, from, '🏓 Pong!');
  const ms = Date.now() - start;
  await sendText(sock, from, `⚡ Response time: *${ms}ms*`);
}

module.exports = { pingCommand };

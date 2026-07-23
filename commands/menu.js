const config = require('../config');
const { sendText } = require('../lib/send');

async function menuCommand(sock, from, botState) {
  const p = config.PREFIX;
  const mode = botState?.mode || config.MODE || 'public';

  const text =
`╭━━━━━━━━━━━━━━━━━━━━━╮
┃   🤖 *${config.BOT_NAME}*
╰━━━━━━━━━━━━━━━━━━━━━╯

*📌 General*
┣ ${p}menu  —  Show this menu
┗ ${p}ping  —  Check bot speed

*🎨 Media*
┣ ${p}sticker  —  Convert image/video to sticker
┗ ${p}vv  —  Save once-view media to owner DM

*🛡️ Owner Only*
┣ ${p}antidelete on/off  —  Catch deleted msgs
┣ ${p}mode public/private  —  Switch bot mode
┣ ${p}setsudo <number>  —  Add sudo user
┣ ${p}delsudo <number>  —  Remove sudo user
┗ ${p}getsudo  —  List sudo users

╭━━━━━━━━━━━━━━━━━━━━━╮
┃ 👤 Owner: *${config.OWNER_NAME}*
┃ 🔘 Mode:  *${mode.toUpperCase()}*
╰━━━━━━━━━━━━━━━━━━━━━╯`;

  await sendText(sock, from, text);
}

module.exports = { menuCommand };

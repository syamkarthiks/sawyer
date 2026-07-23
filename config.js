require('dotenv').config();

const toBool = (x) => x && (x.toLowerCase() === 'true' || x.toLowerCase() === 'on') || false;

module.exports = {
  PREFIX:       process.env.PREFIX        || '.',
  OWNER_NUMBER: process.env.OWNER_NUMBER  || '919888280858',
  BOT_NAME:     process.env.BOT_NAME      || 'Sawyer Bot',
  OWNER_NAME:   process.env.OWNER_NAME    || 'Syam',
  PORT:         Number(process.env.PORT   || 3000),
  SUDO_NUMBERS: (process.env.SUDO_NUMBERS || '919888280858').split(',').map((v) => v.trim()).filter(Boolean),
  MODE:         (process.env.MODE         || 'public').toLowerCase(), // 'public' or 'private'
  SESSION_ID:   process.env.SESSION_ID    || '',
  SESSION_DIR:  process.env.SESSION_DIR   || '',
  STICKER_NAME: process.env.STICKER_NAME  || 'syam; awyer',
  NODE_ENV:     process.env.NODE_ENV      || 'development',
};
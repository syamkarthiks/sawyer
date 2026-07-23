const fs = require('fs');
const path = require('path');
const config = require('../config');

const SUDO_FILE = path.join(__dirname, '..', 'data', 'sudo.json');

function normalizeJid(jid) {
  if (!jid) return '';
  const raw = jid.toString();
  const clean = raw.split('@')[0].split(':')[0];
  return clean.replace(/[^0-9]/g, '');
}

function loadSudoNumbers() {
  if (!fs.existsSync(SUDO_FILE)) {
    fs.writeFileSync(SUDO_FILE, '[]', 'utf8');
    return [];
  }

  try {
    const raw = fs.readFileSync(SUDO_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => normalizeJid(item)) : [];
  } catch (error) {
    console.error('Failed to read sudo list:', error);
    return [];
  }
}

function saveSudoNumbers(numbers) {
  fs.writeFileSync(SUDO_FILE, JSON.stringify(numbers, null, 2), 'utf8');
}

function getSudoNumbers() {
  const numbers = loadSudoNumbers();
  const owner = normalizeJid(config.OWNER_NUMBER);
  return [...new Set([owner, ...numbers].filter(Boolean))];
}

function addSudoNumber(number) {
  const normalized = normalizeJid(number);
  if (!normalized) return { success: false, message: 'Invalid number.' };

  const current = loadSudoNumbers();
  if (current.includes(normalized)) {
    return { success: false, message: 'Number is already sudo.' };
  }

  current.push(normalized);
  saveSudoNumbers(current);
  return { success: true, message: `Added sudo: ${normalized}` };
}

function removeSudoNumber(number) {
  const normalized = normalizeJid(number);
  if (!normalized) return { success: false, message: 'Invalid number.' };

  const current = loadSudoNumbers();
  const filtered = current.filter((item) => item !== normalized);
  saveSudoNumbers(filtered);
  return { success: true, message: `Removed sudo: ${normalized}` };
}

module.exports = { getSudoNumbers, addSudoNumber, removeSudoNumber, normalizeJid };

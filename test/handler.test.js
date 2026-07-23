const test = require('node:test');
const assert = require('node:assert/strict');
const { extractMessageText } = require('../lib/handler');

test('extractMessageText gets plain text from conversation', () => {
  const msg = {
    message: {
      conversation: '.ping'
    }
  };

  assert.equal(extractMessageText(msg), '.ping');
});

test('extractMessageText gets text from extended text message', () => {
  const msg = {
    message: {
      extendedTextMessage: {
        text: '.menu'
      }
    }
  };

  assert.equal(extractMessageText(msg), '.menu');
});

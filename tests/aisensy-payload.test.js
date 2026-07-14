const test = require('node:test');
const assert = require('node:assert/strict');
require('ts-node/register/transpile-only');

const { buildAiSensyOtpPayload, validateAiSensyPayload } = require('../lib/whatsapp/aisensy');

test('buildAiSensyOtpPayload uses a single OTP template parameter by default', () => {
  const payload = buildAiSensyOtpPayload({
    apiKey: 'test-key',
    campaignName: 'login_millionflats',
    destination: '971501234567',
    otp: '123456',
    context: 'login',
    supportContact: '1800-555-1234',
  });

  assert.deepEqual(payload.templateParams, ['123456']);
  assert.equal(payload.campaignName, 'login_millionflats');
  assert.equal(payload.destination, '971501234567');
});

test('validateAiSensyPayload rejects empty and mismatched template params', () => {
  const result = validateAiSensyPayload({
    apiKey: 'test-key',
    campaignName: 'login_millionflats',
    destination: '971501234567',
    templateParams: ['123456', 'extra'],
  }, { expectedPlaceholderCount: 1 });

  assert.equal(result.valid, false);
  assert.match(result.error, /expected 1 placeholder/i);
});

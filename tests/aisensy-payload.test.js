const test = require('node:test');
const assert = require('node:assert/strict');
require('ts-node/register/transpile-only');

const { buildAiSensyOtpPayload, validateAiSensyPayload, resolveAiSensyUserName } = require('../lib/whatsapp/aisensy');

test('buildAiSensyOtpPayload includes a normalized userName for AiSensy', () => {
  const payload = buildAiSensyOtpPayload({
    apiKey: 'test-key',
    campaignName: 'login_millionflats',
    destination: '971501234567',
    otp: '123456',
    context: 'login',
    supportContact: '1800-555-1234',
    userName: '  Karan Kathur ',
  });

  assert.deepEqual(payload.templateParams, ['123456']);
  assert.equal(payload.campaignName, 'login_millionflats');
  assert.equal(payload.destination, '+971501234567');
  assert.equal(payload.userName, 'Karan Kathur');
});

test('validateAiSensyPayload rejects empty and mismatched template params', () => {
  const result = validateAiSensyPayload({
    apiKey: 'test-key',
    campaignName: 'login_millionflats',
    destination: '+971501234567',
    userName: 'Test User',
    templateParams: ['123456', 'extra'],
  }, { expectedPlaceholderCount: 1 });

  assert.equal(result.valid, false);
  assert.match(result.error, /expected 1 placeholder/i);
});

test('validateAiSensyPayload rejects invalid userName values', () => {
  const invalid = validateAiSensyPayload({
    apiKey: 'test-key',
    campaignName: 'login_millionflats',
    destination: '+971501234567',
    templateParams: ['123456'],
    userName: '123456',
  }, { expectedPlaceholderCount: 1 });

  assert.equal(invalid.valid, false);
  assert.match(invalid.error, /userName/i);
});

test('resolveAiSensyUserName cleans and preserves valid display names', () => {
  const resolved = resolveAiSensyUserName({ fullName: '  Karan   Kathur  ' });
  assert.equal(resolved, 'Karan Kathur');
});

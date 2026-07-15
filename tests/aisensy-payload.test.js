const test = require('node:test');
const assert = require('node:assert/strict');
require('ts-node/register/transpile-only');

const {
  buildAiSensyOtpPayload,
  validateAiSensyPayload,
  resolveAiSensyUserName,
  normalizePhoneNumber,
} = require('../lib/whatsapp/aisensy');
const { resolveUserName, getUserDisplayName } = require('../lib/userDisplayService');

test('buildAiSensyOtpPayload creates the production-style AiSensy auth payload', () => {
  const payload = buildAiSensyOtpPayload({
    apiKey: 'test-key',
    campaignName: 'millionflats_auth_otp',
    destination: '91 6352454180',
    otp: '123456',
    userName: '  Karan Kathur ',
    source: 'millionflats-auth',
    fallbackUserName: 'MillionFlats User',
  });

  assert.deepEqual(payload.templateParams, ['123456']);
  assert.equal(payload.campaignName, 'millionflats_auth_otp');
  assert.equal(payload.destination, '+916352454180');
  assert.equal(payload.userName, 'Karan Kathur');
  assert.equal(payload.source, 'millionflats-auth');
  assert.ok(Array.isArray(payload.buttons));
  assert.equal(payload.buttons[0].parameters[0].text, '123456');
  assert.equal(payload.paramsFallbackValue.FirstName, 'Karan Kathur');
});

test('validateAiSensyPayload rejects empty and mismatched template params', () => {
  const result = validateAiSensyPayload({
    apiKey: 'test-key',
    campaignName: 'millionflats_auth_otp',
    destination: '+916352454180',
    userName: 'Test User',
    source: 'millionflats-auth',
    templateParams: ['123456', 'extra'],
    buttons: [{ type: 'button', sub_type: 'url', index: 0, parameters: [{ type: 'text', text: '123456' }] }],
    paramsFallbackValue: { FirstName: 'Test User' },
  }, { expectedPlaceholderCount: 1 });

  assert.equal(result.valid, false);
  assert.match(result.error, /expected 1 placeholder/i);
});

test('validateAiSensyPayload rejects invalid userName values', () => {
  const invalid = validateAiSensyPayload({
    apiKey: 'test-key',
    campaignName: 'millionflats_auth_otp',
    destination: '+916352454180',
    templateParams: ['123456'],
    userName: '123456',
    source: 'millionflats-auth',
    buttons: [{ type: 'button', sub_type: 'url', index: 0, parameters: [{ type: 'text', text: '123456' }] }],
    paramsFallbackValue: { FirstName: '123456' },
  }, { expectedPlaceholderCount: 1 });

  assert.equal(invalid.valid, false);
  assert.match(invalid.error, /userName/i);
});

test('normalizePhoneNumber converts common Indian formats to E.164', () => {
  assert.equal(normalizePhoneNumber('6352454180'), '+916352454180');
  assert.equal(normalizePhoneNumber('916352454180'), '+916352454180');
  assert.equal(normalizePhoneNumber('+916352454180'), '+916352454180');
  assert.equal(normalizePhoneNumber('91 6352454180'), '+916352454180');
});

test('resolveAiSensyUserName cleans and preserves valid display names', () => {
  const resolved = resolveAiSensyUserName({ fullName: '  Karan   Kathur  ' });
  assert.equal(resolved, 'Karan Kathur');
});

test('resolveUserName prefers persisted name values and preserves legacy compatibility', () => {
  assert.equal(resolveUserName({ name: '  Jane Doe  ' }), 'Jane Doe');
  assert.equal(resolveUserName({ fullName: 'Legacy User' }), 'Legacy User');
  assert.equal(getUserDisplayName({ email: 'legacy@example.com' }), 'legacy@example.com');
});

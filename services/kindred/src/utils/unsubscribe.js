const crypto = require('crypto');

function generateUnsubscribeToken(userId) {
  return crypto
    .createHmac('sha256', process.env.UNSUBSCRIBE_SECRET)
    .update(userId)
    .digest('hex');
}

function verifyUnsubscribeToken(userId, token) {
  const expected = generateUnsubscribeToken(userId);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

module.exports = { generateUnsubscribeToken, verifyUnsubscribeToken };

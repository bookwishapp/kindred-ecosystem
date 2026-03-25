const crypto = require('crypto');

function generateUnsubscribeToken(email) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET not configured');

  return crypto
    .createHmac('sha256', secret)
    .update(email.toLowerCase())
    .digest('hex')
    .substring(0, 16);
}

function validateUnsubscribeToken(email, token) {
  const expectedToken = generateUnsubscribeToken(email);
  return token === expectedToken;
}

function getUnsubscribeUrl(email) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://terryheath.com';
  const token = generateUnsubscribeToken(email);
  return `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

module.exports = {
  generateUnsubscribeToken,
  validateUnsubscribeToken,
  getUnsubscribeUrl,
};
function requireAdminAuth(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/admin_token=([^;]+)/);
  if (!match) throw new Error('Unauthorized');
  if (match[1] !== process.env.ADMIN_PASSWORD) throw new Error('Unauthorized');
}

module.exports = { requireAdminAuth };

function requireAdmin(req) {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader || !cookieHeader.includes('admin_session=')) {
    throw new Error('Unauthorized');
  }
}

module.exports = { requireAdmin };

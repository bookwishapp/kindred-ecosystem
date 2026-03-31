const PASSPORTR_BASE_URL = process.env.PASSPORTR_BASE_URL || 'https://outstanding-dedication-production-13f3.up.railway.app';
const PASSPORTR_ADMIN_SECRET = process.env.PASSPORTR_ADMIN_SECRET;

async function passportrAdminRequest(path, options = {}) {
  const res = await fetch(`${PASSPORTR_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': PASSPORTR_ADMIN_SECRET,
      ...(options.headers || {}),
    },
  });
  return res;
}

module.exports = { passportrAdminRequest };

const PASSPORTR_API_URL = process.env.PASSPORTR_API_URL;
const PASSPORTR_ADMIN_SECRET = process.env.PASSPORTR_ADMIN_SECRET;

function adminHeaders() {
  return {
    'Authorization': `Bearer ${PASSPORTR_ADMIN_SECRET}`,
    'Content-Type': 'application/json',
  };
}

async function getStats() {
  const res = await fetch(`${PASSPORTR_API_URL}/api/admin/stats`, {
    headers: adminHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch Passportr stats');
  return res.json();
}

async function getOrganizers() {
  const res = await fetch(`${PASSPORTR_API_URL}/api/admin/organizers`, {
    headers: adminHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch organizers');
  return res.json();
}

async function getOrganizer(userId) {
  const res = await fetch(`${PASSPORTR_API_URL}/api/admin/organizers/${userId}`, {
    headers: adminHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch organizer');
  return res.json();
}

async function updateOrganizer(userId, data) {
  const res = await fetch(`${PASSPORTR_API_URL}/api/admin/organizers/${userId}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update organizer');
  return res.json();
}

module.exports = { getStats, getOrganizers, getOrganizer, updateOrganizer };

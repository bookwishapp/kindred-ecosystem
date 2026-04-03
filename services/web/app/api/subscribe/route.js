export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Step 1 — Find or create auth record
    const authRes = await fetch(
      `${process.env.AUTH_BASE_URL}/internal/users/find-or-create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.INTERNAL_SECRET,
        },
        body: JSON.stringify({ email: normalizedEmail }),
      }
    );

    if (!authRes.ok) {
      return Response.json({ error: 'Failed to create account' }, { status: 500 });
    }

    const { user_sub } = await authRes.json();

    // Step 2 — Subscribe to terryheath newsletter
    const mailRes = await fetch(
      `${process.env.MAIL_SERVICE_URL}/subscriptions/subscribe`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mail-secret': process.env.MAIL_SERVICE_SECRET,
        },
        body: JSON.stringify({
          user_sub,
          product: 'terryheath',
        }),
      }
    );

    if (!mailRes.ok) {
      return Response.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

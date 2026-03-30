export const runtime = 'nodejs';

export async function POST(req) {
  const body = await req.json();
  const response = await fetch(`${process.env.AUTH_BASE_URL}/auth/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...body,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/organize/callback`
    })
  });
  const data = await response.json();
  return Response.json(data, { status: response.status });
}

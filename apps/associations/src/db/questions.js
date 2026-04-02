const MIN_WORDS_FOR_QUESTIONS = 200; // don't generate questions until there's enough material

export async function generateQuestion({ projectId, recentText, poolEntries }) {
  if (!recentText || recentText.trim().split(/\s+/).length < MIN_WORDS_FOR_QUESTIONS) {
    return null;
  }

  const token = await window.electron.getToken();
  if (!token) return null;

  // Build context from pool entries — a sample of what exists
  const poolSample = poolEntries
    .slice(0, 10)
    .map(e => e.content)
    .join('\n\n');

  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/qa/question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        excerpt: recentText.slice(-800), // last ~800 chars of current writing
        context: poolSample,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.question || null;
  } catch {
    return null;
  }
}

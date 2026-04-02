export async function generateEmbedding(text) {
  const embedding = await window.electron.generateEmbedding({ text });
  return embedding;
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function embeddingToBuffer(embedding) {
  return Buffer.from(new Float32Array(embedding).buffer);
}

export function bufferToEmbedding(buffer) {
  // buffer comes from SQLite as a Uint8Array in the renderer
  return Array.from(new Float32Array(buffer.buffer || buffer));
}
import { pipeline } from '@xenova/transformers';

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }
  return embedder;
}

export async function generateEmbedding(text) {
  const embed = await getEmbedder();
  const output = await embed(text, {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(output.data);
}

export function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
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
  return Array.from(new Float32Array(buffer.buffer));
}
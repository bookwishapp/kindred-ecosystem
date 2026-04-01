import { generateEmbedding, bufferToEmbedding, cosineSimilarity } from './embeddings';

const SIMILARITY_THRESHOLD = 0.72;
const MIN_ENTRY_LENGTH = 20;

export async function findGhost({ projectId, currentText, excludeIds = [] }) {
  if (!currentText || currentText.trim().length < MIN_ENTRY_LENGTH) return null;

  const entries = await window.electron.db.getPoolEntries({ projectId });
  if (!entries.length) return null;

  const currentEmbedding = await generateEmbedding(currentText.slice(-500));

  let bestMatch = null;
  let bestScore = SIMILARITY_THRESHOLD;

  for (const entry of entries) {
    if (excludeIds.includes(entry.id)) continue;
    const entryEmbedding = bufferToEmbedding(entry.embedding);
    const score = cosineSimilarity(currentEmbedding, entryEmbedding);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { id: entry.id, content: entry.content, score };
    }
  }

  return bestMatch;
}
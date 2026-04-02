import { generateEmbedding, bufferToEmbedding, cosineSimilarity } from './embeddings';
import { SESSION_ID } from './pool';

const MIN_ENTRY_LENGTH = 20;

function getThreshold(poolSize) {
  if (poolSize < 20) return 0.55;
  if (poolSize < 50) return 0.62;
  if (poolSize < 100) return 0.68;
  return 0.75;
}

export async function findGhost({ projectId, currentText, excludeIds = [] }) {
  if (!currentText || currentText.trim().length < MIN_ENTRY_LENGTH) return null;

  const entries = await window.electron.db.getPoolEntries({
    projectId,
    excludeSessionId: SESSION_ID,
  });
  if (!entries.length) return null;

  const currentEmbedding = await generateEmbedding(currentText.slice(-500));

  const threshold = getThreshold(entries.length);
  let bestMatch = null;
  let bestScore = threshold;

  for (const entry of entries) {
    if (excludeIds.includes(entry.id)) continue;
    const entryEmbedding = bufferToEmbedding(entry.embedding);
    const score = cosineSimilarity(currentEmbedding, entryEmbedding);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { id: entry.id, content: entry.content, score };
    }
  }

  // Truncate to 2 sentences maximum
  if (bestMatch) {
    const sentences = bestMatch.content.match(/[^.!?]+[.!?]+/g) || [bestMatch.content];
    bestMatch.content = sentences.slice(0, 2).join(' ').trim();
  }

  return bestMatch;
}
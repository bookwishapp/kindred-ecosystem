import db from './index';
import { generateEmbedding, bufferToEmbedding, cosineSimilarity } from './embeddings';

const SIMILARITY_THRESHOLD = 0.72;
const MIN_ENTRY_LENGTH = 20; // characters — don't surface very short fragments

export async function findGhost({ projectId, currentText, excludeIds = [] }) {
  if (!currentText || currentText.trim().length < MIN_ENTRY_LENGTH) {
    return null;
  }

  // Get all pool entries for this project with embeddings
  const entries = db.prepare(`
    SELECT id, content, embedding
    FROM pool_entries
    WHERE project_id = ?
      AND embedding IS NOT NULL
      AND length(content) >= ?
    ORDER BY created_at DESC
    LIMIT 200
  `).all(projectId, MIN_ENTRY_LENGTH);

  if (entries.length === 0) return null;

  // Generate embedding for current text
  const currentEmbedding = await generateEmbedding(currentText.slice(-500));

  // Find best match above threshold, excluding already-shown ids
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
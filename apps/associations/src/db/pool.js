import { generateEmbedding } from './embeddings';
import { v4 as uuidv4 } from 'uuid';

// Session ID — generated once per app launch, never persists
export const SESSION_ID = uuidv4();

export async function addToPool({ projectId, content, source = 'compose' }) {
  const id = uuidv4();
  const wordCount = content.trim().split(/\s+/).length;
  const embedding = await generateEmbedding(content);

  await window.electron.db.addPoolEntry({
    id,
    projectId,
    source,
    content,
    embedding,
    wordCount,
    sessionId: SESSION_ID,
  });

  return id;
}
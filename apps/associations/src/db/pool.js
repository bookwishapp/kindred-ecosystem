import { generateEmbedding, embeddingToBuffer } from './embeddings';
import { v4 as uuidv4 } from 'uuid';

export async function addToPool({ projectId, content, source = 'compose' }) {
  const id = uuidv4();
  const wordCount = content.trim().split(/\s+/).length;
  const embedding = await generateEmbedding(content);
  const embeddingBuffer = embeddingToBuffer(embedding);
  await window.electron.db.addPoolEntry({ id, projectId, source, content, embeddingBuffer, wordCount });
  return id;
}
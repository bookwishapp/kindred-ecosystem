import { generateEmbedding, embeddingToBuffer } from './embeddings';
import { v4 as uuidv4 } from 'uuid';
import db from './index';

export async function addToPool({ projectId, content, source = 'compose' }) {
  const id = uuidv4();
  const wordCount = content.trim().split(/\s+/).length;
  const embedding = await generateEmbedding(content);
  const embeddingBuffer = embeddingToBuffer(embedding);

  db.prepare(`
    INSERT INTO pool_entries (id, project_id, source, content, embedding, word_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, projectId, source, content, embeddingBuffer, wordCount);

  return id;
}
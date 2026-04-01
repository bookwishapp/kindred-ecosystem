import { generateEmbedding, embeddingToBuffer } from './embeddings';
import { v4 as uuidv4 } from 'uuid';

const PASSAGE_MIN_WORDS = 30;
const PASSAGE_MAX_WORDS = 200;

// Split text into overlapping passages for richer pool coverage
function splitIntoPassages(text) {
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const passages = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    if (words.length < PASSAGE_MIN_WORDS) {
      // Short paragraph — use as-is if not too short
      if (words.length >= 10) passages.push(para);
      continue;
    }

    // Long paragraph — split into overlapping chunks
    let start = 0;
    while (start < words.length) {
      const chunk = words.slice(start, start + PASSAGE_MAX_WORDS).join(' ');
      if (chunk.split(/\s+/).length >= PASSAGE_MIN_WORDS) {
        passages.push(chunk);
      }
      start += Math.floor(PASSAGE_MAX_WORDS * 0.6); // 60% overlap
    }
  }

  return passages;
}

export async function ingestFile({ projectId, filePath, content, onProgress }) {
  const passages = splitIntoPassages(content);
  let ingested = 0;

  for (const passage of passages) {
    try {
      const embedding = await generateEmbedding(passage);
      const embeddingBuffer = embeddingToBuffer(embedding);
      const id = uuidv4();
      const wordCount = passage.split(/\s+/).length;

      await window.electron.db.addPoolEntry({
        id,
        projectId,
        source: 'folder',
        content: passage,
        embeddingBuffer,
        wordCount,
      });

      ingested++;
      if (onProgress) onProgress({ ingested, total: passages.length });
    } catch (err) {
      console.error('Passage ingestion error:', err.message);
    }
  }

  return ingested;
}

export async function ingestFolder({ projectId, folderId, folderPath, onProgress, onFile }) {
  console.log('ingestFolder called', { projectId, folderId, folderPath });
  const files = await window.electron.folders.scan({ folderId, folderPath });
  console.log('Files to ingest:', files.length, files);

  if (files.length === 0) return { filesProcessed: 0, passagesIngested: 0 };

  let filesProcessed = 0;
  let passagesIngested = 0;

  for (const file of files) {
    const content = await window.electron.folders.readFile({ filePath: file.filePath });
    if (!content) continue;

    if (onFile) onFile(file.filePath);

    const count = await ingestFile({
      projectId,
      filePath: file.filePath,
      content,
      onProgress,
    });

    await window.electron.folders.markIngested({
      folderId,
      filePath: file.filePath,
      lastModified: file.lastModified,
    });

    passagesIngested += count;
    filesProcessed++;
  }

  return { filesProcessed, passagesIngested };
}
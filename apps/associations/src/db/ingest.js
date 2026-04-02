import { generateEmbedding } from './embeddings';
import { v4 as uuidv4 } from 'uuid';

const MIN_SENTENCE_WORDS = 8;
const MIN_PASSAGE_WORDS = 10;

function splitIntoPassages(text) {
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
  const rawSentences = text.match(sentenceRegex) || [];

  const sentences = rawSentences
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).filter(w => w.length > 0).length >= MIN_SENTENCE_WORDS);

  if (sentences.length === 0) {
    const words = text.trim().split(/\s+/).length;
    return words >= MIN_PASSAGE_WORDS ? [text.trim()] : [];
  }

  const passages = [];

  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].split(/\s+/).length >= MIN_PASSAGE_WORDS) {
      passages.push(sentences[i]);
    }
    if (i + 1 < sentences.length) {
      passages.push(`${sentences[i]} ${sentences[i + 1]}`);
    }
    if (i + 2 < sentences.length) {
      passages.push(`${sentences[i]} ${sentences[i + 1]} ${sentences[i + 2]}`);
    }
  }

  return [...new Set(passages)];
}

export async function ingestFile({ projectId, filePath, content, onProgress }) {
  const passages = splitIntoPassages(content);
  let ingested = 0;

  for (const passage of passages) {
    try {
      const embedding = await generateEmbedding(passage);
      const id = uuidv4();
      const wordCount = passage.split(/\s+/).length;

      await window.electron.db.addPoolEntry({
        id,
        projectId,
        source: 'folder',
        content: passage,
        embedding, // pass raw array, not buffer
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
      passagesIngested: count,
    });

    passagesIngested += count;
    filesProcessed++;
  }

  return { filesProcessed, passagesIngested };
}
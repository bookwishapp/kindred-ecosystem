import { pipeline } from '@xenova/transformers';
import { parentPort } from 'worker_threads';

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

parentPort.on('message', async ({ id, text }) => {
  console.log('Worker received message, id:', id);
  try {
    const embed = await getEmbedder();
    console.log('Embedder ready, generating embedding...');
    const output = await embed(text, { pooling: 'mean', normalize: true });
    parentPort.postMessage({ id, embedding: Array.from(output.data), error: null });
  } catch (err) {
    parentPort.postMessage({ id, embedding: null, error: err.message });
  }
});
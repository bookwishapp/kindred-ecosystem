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
    console.log('Embedding generated, dimensions:', output.data.length);
    parentPort.postMessage({ id, embedding: Array.from(output.data), error: null });
    console.log('Response sent for id:', id);
  } catch (err) {
    parentPort.postMessage({ id, embedding: null, error: err.message });
  }
});
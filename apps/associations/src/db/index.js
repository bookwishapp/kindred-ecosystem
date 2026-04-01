import Database from 'better-sqlite3';
import path from 'path';

// In renderer process, use a local path for development
// In production, the path will be passed via IPC from main process
const dbPath = path.join(process.cwd(), 'associations.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

export default db;
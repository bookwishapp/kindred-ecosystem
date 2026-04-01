import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

const dbPath = app
  ? path.join(app.getPath('userData'), 'associations.db')
  : path.join(process.cwd(), 'associations.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

export default db;
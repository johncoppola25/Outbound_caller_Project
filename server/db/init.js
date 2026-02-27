import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/outbound_caller.db');

let db = null;

export async function getDb() {
  if (!db) {
    await initDatabase();
  }
  return db;
}

// Wrapper to make sql.js work like better-sqlite3
function createDbWrapper(database) {
  return {
    prepare: (sql) => {
      return {
        run: (...params) => {
          database.run(sql, params);
          saveDatabase();
        },
        get: (...params) => {
          const stmt = database.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        },
        all: (...params) => {
          const results = [];
          const stmt = database.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        }
      };
    },
    exec: (sql) => {
      database.run(sql);
      saveDatabase();
    },
    pragma: () => {} // No-op for sql.js
  };
}

function saveDatabase() {
  if (db && db._db) {
    const data = db._db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Load existing database or create new
  let database;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    database = new SQL.Database(fileBuffer);
  } else {
    database = new SQL.Database();
  }
  
  // Create wrapper with better-sqlite3-like API
  db = createDbWrapper(database);
  db._db = database; // Keep reference for saving
  
  // Campaigns table - stores AI assistant configurations
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      ai_prompt TEXT NOT NULL,
      voice TEXT DEFAULT 'astra',
      language TEXT DEFAULT 'en-US',
      telnyx_assistant_id TEXT,
      caller_id TEXT,
      greeting TEXT DEFAULT 'Hello,',
      time_limit_secs INTEGER DEFAULT 1800,
      voicemail_detection INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add new columns if they don't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN greeting TEXT DEFAULT 'Hello,'`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN time_limit_secs INTEGER DEFAULT 1800`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN voicemail_detection INTEGER DEFAULT 1`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN background_audio TEXT DEFAULT 'silence'`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN bot_name TEXT DEFAULT 'Julia'`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN voice_speed REAL DEFAULT 1.0`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE calls ADD COLUMN callback_preferred_at TEXT`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE calls ADD COLUMN appointment_at TEXT`);
  } catch (e) { /* column may already exist */ }
  
  // Contacts table - stores uploaded contacts per campaign
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      property_address TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);
  
  // Calls table - tracks all call activity
  db.exec(`
    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      telnyx_call_id TEXT,
      status TEXT DEFAULT 'queued',
      outcome TEXT,
      duration_seconds INTEGER,
      recording_url TEXT,
      transcript TEXT,
      summary TEXT,
      started_at DATETIME,
      ended_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    )
  `);
  
  // Do-not-call list
  db.exec(`
    CREATE TABLE IF NOT EXISTS do_not_call (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Call events table - detailed event tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS call_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      call_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
    )
  `);
  
  saveDatabase();
  console.log('✅ Database initialized successfully');
  
  return db;
}

// Save database periodically and on exit
setInterval(saveDatabase, 30000); // Save every 30 seconds
process.on('exit', saveDatabase);
process.on('SIGINT', () => { saveDatabase(); process.exit(); });
process.on('SIGTERM', () => { saveDatabase(); process.exit(); });

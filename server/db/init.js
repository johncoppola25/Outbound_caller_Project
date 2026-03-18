import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use Render persistent disk if available, otherwise local data folder
const dbPath = process.env.RENDER
  ? '/data/outbound_caller.db'
  : path.join(__dirname, '../../data/outbound_caller.db');

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
  
  // Load existing database, seed from local copy, or create new
  const seedPath = path.join(__dirname, 'seed.db');
  let database;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    database = new SQL.Database(fileBuffer);
    // If existing db is empty but seed has data, use seed instead
    if (fs.existsSync(seedPath)) {
      let isEmpty = false;
      try {
        const countStmt = database.prepare('SELECT COUNT(*) as cnt FROM campaigns');
        countStmt.step();
        const count = countStmt.getAsObject().cnt;
        countStmt.free();
        isEmpty = count === 0;
      } catch (e) {
        // Table doesn't exist yet = empty database
        isEmpty = true;
      }
      if (isEmpty) {
        console.log('Existing database is empty, replacing with seed data...');
        database.close();
        const seedBuffer = fs.readFileSync(seedPath);
        database = new SQL.Database(seedBuffer);
      }
    }
  } else if (fs.existsSync(seedPath)) {
    console.log('Seeding database from local copy...');
    const seedBuffer = fs.readFileSync(seedPath);
    database = new SQL.Database(seedBuffer);
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
    db.exec(`ALTER TABLE calls ADD COLUMN estimated_cost REAL DEFAULT 0`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE calls ADD COLUMN callback_preferred_at TEXT`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE calls ADD COLUMN appointment_at TEXT`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN calling_hours_start TEXT DEFAULT '09:00'`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN calling_hours_end TEXT DEFAULT '18:00'`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN calling_timezone TEXT DEFAULT 'America/New_York'`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN calling_days TEXT DEFAULT '1,2,3,4,5'`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN sms_follow_up INTEGER DEFAULT 0`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN sms_template TEXT`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN max_retries INTEGER DEFAULT 1`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN retry_delay_hours INTEGER DEFAULT 48`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN voicemail_message TEXT`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE campaigns ADD COLUMN user_id TEXT REFERENCES users(id)`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE meeting_history ADD COLUMN user_id TEXT REFERENCES users(id)`);
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
  
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN lead_score INTEGER DEFAULT 0`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN call_attempts INTEGER DEFAULT 0`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN last_called_at TEXT`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN next_retry_at TEXT`);
  } catch (e) { /* column may already exist */ }

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
  
  // Users table - authentication
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      company TEXT,
      role TEXT DEFAULT 'agent',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    db.exec(`ALTER TABLE users ADD COLUMN stripe_customer_id TEXT`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN subscription_plan TEXT`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'none'`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN setup_fee_paid INTEGER DEFAULT 0`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN calling_balance REAL DEFAULT 0`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN auto_fund_enabled INTEGER DEFAULT 0`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN auto_fund_amount INTEGER DEFAULT 50`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN auto_fund_threshold INTEGER DEFAULT 20`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN secondary_emails TEXT DEFAULT ''`);
  } catch (e) { /* column may already exist */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN username TEXT`);
  } catch (e) { /* column may already exist */ }

  // Meeting history table - completed meetings
  db.exec(`
    CREATE TABLE IF NOT EXISTS meeting_history (
      id TEXT PRIMARY KEY,
      call_id TEXT,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      property_address TEXT,
      campaign_name TEXT,
      appointment_at TEXT,
      outcome TEXT,
      notes TEXT,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (call_id) REFERENCES calls(id)
    )
  `);

  // User phone numbers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_phone_numbers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      telnyx_id TEXT,
      friendly_name TEXT,
      monthly_cost REAL DEFAULT 2.00,
      status TEXT DEFAULT 'active',
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Payments table - tracks all payments locally
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      stripe_payment_id TEXT,
      status TEXT DEFAULT 'succeeded',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Activity log table - tracks user and system events
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Index on user_id and created_at for efficient queries
  db.exec(`CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at)`);

  // Seed users
  const bcrypt = await import('bcryptjs');
  const { v4: uuidv4 } = await import('uuid');

  // Dozer19 - regular user (formerly KENNYL)
  // Rename KENNYL to Dozer19 if exists
  const existingOldKenny = db.prepare('SELECT id FROM users WHERE name = ?').get('KENNYL');
  if (existingOldKenny) {
    const kennyHash = await bcrypt.default.hash('CapChaos1916!!', 10);
    db.prepare('UPDATE users SET name = ?, password_hash = ? WHERE name = ?').run('Dozer19', kennyHash, 'KENNYL');
    console.log('👤 Renamed KENNYL to Dozer19');
  }
  const existingKenny = db.prepare('SELECT id FROM users WHERE name = ?').get('Dozer19');
  const kennyHash = await bcrypt.default.hash('CapChaos1916!!', 10);
  if (!existingKenny) {
    db.prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)').run(
      uuidv4(), 'kenny@estatereach.com', kennyHash, 'Dozer19', 'user'
    );
    console.log('👤 Default user created (Dozer19)');
  } else {
    // One-time fix: reset password that was accidentally overwritten
    db.prepare('UPDATE users SET password_hash = ? WHERE name = ?').run(kennyHash, 'Dozer19');
  }

  // Admin account
  const existingAdmin = db.prepare('SELECT id FROM users WHERE name = ?').get('EstateAdmin');
  const adminHash = await bcrypt.default.hash('SPARTANS14!', 10);
  if (!existingAdmin) {
    db.prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)').run(
      uuidv4(), 'admin@estatereach.com', adminHash, 'EstateAdmin', 'admin'
    );
    console.log('👤 Admin user created (EstateAdmin)');
  } else {
    db.prepare('UPDATE users SET password_hash = ? WHERE name = ?').run(adminHash, 'EstateAdmin');
  }

  // john.coppola25 - free account with full access
  const existingJohn = db.prepare('SELECT id FROM users WHERE email = ?').get('john.coppola25@gmail.com');
  const johnHash = await bcrypt.default.hash('Coppola25$$', 10);
  if (!existingJohn) {
    db.prepare('INSERT INTO users (id, email, password_hash, name, role, setup_fee_paid, subscription_status, subscription_plan, calling_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      uuidv4(), 'john.coppola25@gmail.com', johnHash, 'John', 'user', 1, 'active', 'monthly', 100
    );
    console.log('👤 Free user created (john.coppola25@gmail.com)');
  } else {
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(johnHash, 'john.coppola25@gmail.com');
  }

  // Assign orphaned campaigns to Dozer19 user
  const kennyUser = db.prepare('SELECT id FROM users WHERE name = ?').get('Dozer19');
  if (kennyUser) {
    db.prepare('UPDATE campaigns SET user_id = ? WHERE user_id IS NULL').run(kennyUser.id);
    db.prepare('UPDATE meeting_history SET user_id = ? WHERE user_id IS NULL').run(kennyUser.id);
  }

  saveDatabase();
  console.log('✅ Database initialized successfully');

  return db;
}

// Save database periodically and on exit
setInterval(saveDatabase, 30000); // Save every 30 seconds
process.on('exit', saveDatabase);
process.on('SIGINT', () => { saveDatabase(); process.exit(); });
process.on('SIGTERM', () => { saveDatabase(); process.exit(); });

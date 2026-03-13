import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const usePostgres = Boolean(process.env.DATABASE_URL);

// -----------------------------
// Общие типы строк
// -----------------------------

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: string;
};

export type PhoneVerificationRow = {
  id: number;
  phone: string;
  code: string;
  expires_at: string;
  created_at: string;
};

export type ProjectRow = {
  id: number;
  user_id: number;
  address: string;
  status: 'active' | 'done';
  date_start: string | null;
  date_end: string | null;
  start_date_ymd: string | null;
  end_date_ymd: string | null;
  cover_image_uri: string | null;
  plan_image_uri: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  created_at: string;
};

export type QrLoginTokenRow = {
  id: number;
  user_id: number;
  code: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
};

// -----------------------------
// SQLite (локальная разработка)
// -----------------------------

let sqliteDb: Database | null = null;

function initSqlite() {
  if (sqliteDb) return;

  const dbDir = process.env.DB_PATH
    ? path.dirname(process.env.DB_PATH)
    : path.join(__dirname, '..', 'data');
  const dbPath = process.env.DB_PATH ?? path.join(dbDir, 'fenceai.db');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS phone_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      date_start TEXT,
      date_end TEXT,
      start_date_ymd TEXT,
      end_date_ymd TEXT,
      cover_image_uri TEXT,
      plan_image_uri TEXT,
      client_name TEXT,
      client_phone TEXT,
      client_email TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

    CREATE TABLE IF NOT EXISTS qr_login_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      used_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_qr_login_tokens_code ON qr_login_tokens(code);
  `);

  sqliteDb = db;
}

// -----------------------------
// Postgres (Render / production)
// -----------------------------

let pgPool: Pool | null = null;

async function initPostgres() {
  if (pgPool) return;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for Postgres mode');
  }

  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Для Render PostgreSQL обычно не нужен строгий SSL, но если включён — можно раскомментировать:
    // ssl: { rejectUnauthorized: false },
  });

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS phone_verifications (
      id SERIAL PRIMARY KEY,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);

    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      date_start TEXT,
      date_end TEXT,
      start_date_ymd TEXT,
      end_date_ymd TEXT,
      cover_image_uri TEXT,
      plan_image_uri TEXT,
      client_name TEXT,
      client_phone TEXT,
      client_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

    CREATE TABLE IF NOT EXISTS qr_login_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_qr_login_tokens_code ON qr_login_tokens(code);
  `);
}

// -----------------------------
// Публичный API
// -----------------------------

export async function initDb() {
  if (usePostgres) {
    await initPostgres();
  } else {
    initSqlite();
  }
}

function ensureSqlite() {
  if (!sqliteDb) initSqlite();
  if (!sqliteDb) throw new Error('SQLite DB not initialized');
  return sqliteDb;
}

function ensurePg() {
  if (!pgPool) {
    throw new Error('Postgres pool not initialized');
  }
  return pgPool;
}

// --- Users ---

export async function createUser(
  email: string,
  passwordHash: string,
  name: string | null
): Promise<UserRow> {
  if (usePostgres) {
    const pool = ensurePg();
    const result = await pool.query<UserRow>(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
      [email, passwordHash, name]
    );
    return result.rows[0];
  }

  const db = ensureSqlite();
  const stmt = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  );
  const info = stmt.run(email, passwordHash, name);
  const row = db
    .prepare(
      'SELECT id, email, password_hash, name, created_at FROM users WHERE id = ?'
    )
    .get(info.lastInsertRowid) as UserRow;
  return row;
}

export async function findUserByEmail(
  email: string
): Promise<UserRow | null> {
  if (usePostgres) {
    const pool = ensurePg();
    const result = await pool.query<UserRow>(
      'SELECT id, email, password_hash, name, created_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] ?? null;
  }

  const db = ensureSqlite();
  const row = db
    .prepare(
      'SELECT id, email, password_hash, name, created_at FROM users WHERE email = ?'
    )
    .get(email) as UserRow | undefined;
  return row ?? null;
}

// --- Phone verifications ---

export async function insertPhoneVerification(
  phone: string,
  code: string,
  expiresAtIso: string
): Promise<void> {
  if (usePostgres) {
    const pool = ensurePg();
    await pool.query(
      'INSERT INTO phone_verifications (phone, code, expires_at) VALUES ($1, $2, $3)',
      [phone, code, expiresAtIso]
    );
    return;
  }

  const db = ensureSqlite();
  db.prepare(
    'INSERT INTO phone_verifications (phone, code, expires_at) VALUES (?, ?, ?)'
  ).run(phone, code, expiresAtIso);
}

export async function getLastPhoneVerification(
  phone: string
): Promise<{ phone: string; code: string; expires_at: string } | null> {
  if (usePostgres) {
    const pool = ensurePg();
    const result = await pool.query(
      'SELECT phone, code, expires_at FROM phone_verifications WHERE phone = $1 ORDER BY created_at DESC LIMIT 1',
      [phone]
    );
    return (result.rows[0] as any) ?? null;
  }

  const db = ensureSqlite();
  const row = db
    .prepare(
      'SELECT phone, code, expires_at FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1'
    )
    .get(phone) as { phone: string; code: string; expires_at: string } | undefined;
  return row ?? null;
}

// --- Projects ---

export async function listProjectsForUser(
  userId: number
): Promise<ProjectRow[]> {
  if (usePostgres) {
    const pool = ensurePg();
    const result = await pool.query<ProjectRow>(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
      [userId]
    );
    return result.rows;
  }

  const db = ensureSqlite();
  const rows = db
    .prepare<ProjectRow>(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC, id DESC'
    )
    .all(userId) as ProjectRow[];
  return rows;
}

export async function insertProject(
  userId: number,
  payload: {
    address: string;
    status: 'active' | 'done';
    dateStart: string | null;
    dateEnd: string | null;
    startDateYmd: string | null;
    endDateYmd: string | null;
    coverImageUri: string | null;
    planImageUri: string | null;
    clientName: string | null;
    clientPhone: string | null;
    clientEmail: string | null;
  }
): Promise<ProjectRow> {
  const {
    address,
    status,
    dateStart,
    dateEnd,
    startDateYmd,
    endDateYmd,
    coverImageUri,
    planImageUri,
    clientName,
    clientPhone,
    clientEmail,
  } = payload;

  if (usePostgres) {
    const pool = ensurePg();
    const result = await pool.query<ProjectRow>(
      `INSERT INTO projects
       (user_id, address, status, date_start, date_end, start_date_ymd, end_date_ymd,
        cover_image_uri, plan_image_uri, client_name, client_phone, client_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        userId,
        address,
        status,
        dateStart,
        dateEnd,
        startDateYmd,
        endDateYmd,
        coverImageUri,
        planImageUri,
        clientName,
        clientPhone,
        clientEmail,
      ]
    );
    return result.rows[0];
  }

  const db = ensureSqlite();
  const stmt = db.prepare(
    `INSERT INTO projects
     (user_id, address, status, date_start, date_end, start_date_ymd, end_date_ymd,
      cover_image_uri, plan_image_uri, client_name, client_phone, client_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const info = stmt.run(
    userId,
    address,
    status,
    dateStart,
    dateEnd,
    startDateYmd,
    endDateYmd,
    coverImageUri,
    planImageUri,
    clientName,
    clientPhone,
    clientEmail
  );
  const row = db
    .prepare<ProjectRow>('SELECT * FROM projects WHERE id = ?')
    .get(info.lastInsertRowid) as ProjectRow;
  return row;
}

// --- QR login tokens ---

export async function insertQrLoginToken(
  userId: number,
  code: string,
  expiresAtIso: string
): Promise<void> {
  if (usePostgres) {
    const pool = ensurePg();
    await pool.query(
      'INSERT INTO qr_login_tokens (user_id, code, expires_at) VALUES ($1, $2, $3)',
      [userId, code, expiresAtIso]
    );
    return;
  }

  const db = ensureSqlite();
  db.prepare(
    'INSERT INTO qr_login_tokens (user_id, code, expires_at) VALUES (?, ?, ?)'
  ).run(userId, code, expiresAtIso);
}

export async function getQrLoginTokenWithUser(
  code: string
): Promise<
  (UserRow & {
    code: string;
    expires_at: string;
    used_at: string | null;
  }) | null
> {
  if (usePostgres) {
    const pool = ensurePg();
    const result = await pool.query(
      `SELECT q.user_id, q.code, q.expires_at, q.used_at,
              u.email, u.password_hash, u.name, u.created_at, u.id
       FROM qr_login_tokens q
       JOIN users u ON u.id = q.user_id
       WHERE q.code = $1
       ORDER BY q.created_at DESC
       LIMIT 1`,
      [code]
    );
    const row = result.rows[0];
    return (row as any) ?? null;
  }

  const db = ensureSqlite();
  const row = db
    .prepare(
      `SELECT q.user_id, q.code, q.expires_at, q.used_at,
              u.email, u.password_hash, u.name, u.created_at, u.id
       FROM qr_login_tokens q
       JOIN users u ON u.id = q.user_id
       WHERE q.code = ?
       ORDER BY q.created_at DESC
       LIMIT 1`
    )
    .get(code) as
    | (UserRow & {
        code: string;
        expires_at: string;
        used_at: string | null;
      })
    | undefined;
  return row ?? null;
}

export async function markQrTokenUsed(code: string): Promise<void> {
  if (usePostgres) {
    const pool = ensurePg();
    await pool.query(
      'UPDATE qr_login_tokens SET used_at = NOW() WHERE code = $1',
      [code]
    );
    return;
  }

  const db = ensureSqlite();
  db.prepare(
    "UPDATE qr_login_tokens SET used_at = datetime('now') WHERE code = ?"
  ).run(code);
}


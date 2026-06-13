import { Pool } from 'pg'
import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'

const isProd = process.env.NODE_ENV === 'production'

// Setup env variables if using dot env
import dotenv from 'dotenv'
dotenv.config()

const dbUrl = process.env.DATABASE_URL
export const isPostgres = !!dbUrl && dbUrl.startsWith('postgresql')

let pgPool: Pool | null = null
let sqliteDb: sqlite3.Database | null = null

if (isPostgres) {
  console.log('Connecting to PostgreSQL database...')
  pgPool = new Pool({
    connectionString: dbUrl,
    ssl: isProd ? { rejectUnauthorized: false } : false
  })
} else {
  console.log('No PostgreSQL configuration found. Falling back to local SQLite database...')
  const dbPath = path.join(__dirname, '..', 'database.sqlite')
  sqliteDb = new sqlite3.Database(dbPath)
}

// Unified query wrapper supporting async/await
export const query = async (sql: string, params: any[] = []): Promise<any> => {
  if (isPostgres && pgPool) {
    const res = await pgPool.query(sql, params)
    return res.rows
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      // Convert $1, $2, $3... placeholders to sqlite ? placeholders
      const sqliteSql = sql.replace(/\$\d+/g, '?')
      
      const isSelect = sql.trim().toLowerCase().startsWith('select')
      if (isSelect) {
        sqliteDb!.all(sqliteSql, params, (err, rows) => {
          if (err) reject(err)
          else resolve(rows)
        })
      } else {
        sqliteDb!.run(sqliteSql, params, function (err) {
          if (err) reject(err)
          else resolve({ lastID: this.lastID, changes: this.changes })
        })
      }
    })
  }
  throw new Error('Database not initialized')
}

// Initialize tables on startup
export const initDb = async () => {
  console.log('Initializing database tables...')
  
  // 1. Create Users Table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      uid VARCHAR(255) PRIMARY KEY,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      email VARCHAR(255),
      phone VARCHAR(50),
      avatar VARCHAR(50)
    )
  `)

  // 2. Create Groups Table
  if (isPostgres) {
    await query(`
      CREATE TABLE IF NOT EXISTS groups (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        members TEXT[] NOT NULL,
        icon VARCHAR(100),
        description TEXT,
        owner_uid VARCHAR(255) REFERENCES users(uid),
        currency VARCHAR(10)
      )
    `)
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS groups (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        members TEXT NOT NULL, -- JSON string serialized string list
        icon VARCHAR(100),
        description TEXT,
        owner_uid VARCHAR(255) REFERENCES users(uid),
        currency VARCHAR(10)
      )
    `)
  }

  // 3. Create Expenses Table
  await query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id VARCHAR(255) PRIMARY KEY,
      group_id VARCHAR(255) REFERENCES groups(id) ON DELETE CASCADE,
      description VARCHAR(255),
      amount NUMERIC(12, 2) NOT NULL,
      paid_by VARCHAR(255),
      split_type VARCHAR(50),
      date VARCHAR(50),
      category VARCHAR(100),
      currency VARCHAR(10) DEFAULT 'USD',
      exchange_rate NUMERIC(12, 6) DEFAULT 1.0,
      is_anomaly BOOLEAN DEFAULT FALSE,
      import_id VARCHAR(255)
    )
  `)

  // Try to alter expenses table if it already exists (for existing SQLite databases)
  try { await query(`ALTER TABLE expenses ADD COLUMN currency VARCHAR(10) DEFAULT 'USD'`) } catch (e) {}
  try { await query(`ALTER TABLE expenses ADD COLUMN exchange_rate NUMERIC(12, 6) DEFAULT 1.0`) } catch (e) {}
  try { await query(`ALTER TABLE expenses ADD COLUMN is_anomaly BOOLEAN DEFAULT FALSE`) } catch (e) {}
  try { await query(`ALTER TABLE expenses ADD COLUMN import_id VARCHAR(255)`) } catch (e) {}

  // 4. Create Group Memberships Table (For Join/Leave Tracking)
  await query(`
    CREATE TABLE IF NOT EXISTS group_memberships (
      id VARCHAR(255) PRIMARY KEY,
      group_id VARCHAR(255) REFERENCES groups(id) ON DELETE CASCADE,
      user_uid VARCHAR(255),
      joined_at VARCHAR(50),
      left_at VARCHAR(50)
    )
  `)

  // 5. Create Audit Logs Table (For Expense Traceability)
  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(255) PRIMARY KEY,
      entity_id VARCHAR(255),
      action VARCHAR(50),
      user_uid VARCHAR(255),
      timestamp VARCHAR(50),
      details TEXT
    )
  `)

  // 6. Create Settlements Table (For Settlement Management)
  await query(`
    CREATE TABLE IF NOT EXISTS settlements (
      id VARCHAR(255) PRIMARY KEY,
      group_id VARCHAR(255) REFERENCES groups(id) ON DELETE CASCADE,
      paid_by VARCHAR(255),
      paid_to VARCHAR(255),
      amount NUMERIC(12, 2) NOT NULL,
      method VARCHAR(50),
      status VARCHAR(50),
      date VARCHAR(50)
    )
  `)
  // 7. Create Expense Splits Table
  await query(`
    CREATE TABLE IF NOT EXISTS expense_splits (
      id VARCHAR(255) PRIMARY KEY,
      expense_id VARCHAR(255) REFERENCES expenses(id) ON DELETE CASCADE,
      user_uid VARCHAR(255),
      amount NUMERIC(12, 2) NOT NULL,
      type VARCHAR(50) DEFAULT 'equal'
    )
  `)

  // 8. Create Import Reports Table
  await query(`
    CREATE TABLE IF NOT EXISTS import_reports (
      id VARCHAR(255) PRIMARY KEY,
      group_id VARCHAR(255) REFERENCES groups(id) ON DELETE CASCADE,
      date VARCHAR(50),
      rows_imported INTEGER DEFAULT 0,
      issues_fixed INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Success'
    )
  `)

  // 9. Create Anomalies Table
  await query(`
    CREATE TABLE IF NOT EXISTS anomalies (
      id VARCHAR(255) PRIMARY KEY,
      import_id VARCHAR(255) REFERENCES import_reports(id) ON DELETE CASCADE,
      row_number INTEGER,
      issue_type VARCHAR(255),
      original_value TEXT,
      action_taken VARCHAR(255),
      final_status VARCHAR(50)
    )
  `)

  console.log('Database initialization completed successfully!')
}

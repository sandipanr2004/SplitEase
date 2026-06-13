import { Pool } from 'pg'
import sqlite3 from 'sqlite3'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const dbPath = path.join(__dirname, '..', 'database.sqlite')
const sqliteDb = new sqlite3.Database(dbPath)

// Helper to query sqlite
const querySqlite = (sql: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, [], (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

const migrateTable = async (tableName: string, columns: string[]) => {
  console.log(`Migrating ${tableName}...`)
  
  const rows = await querySqlite(`SELECT * FROM ${tableName}`)
  console.log(`Found ${rows.length} rows in SQLite ${tableName}.`)
  
  if (rows.length === 0) return

  // Build the bulk insert query
  const placeholders = rows.map((_, i) => {
    const start = i * columns.length + 1
    const params = columns.map((_, j) => `$${start + j}`).join(', ')
    return `(${params})`
  }).join(', ')

  const values = rows.flatMap(row => columns.map(col => row[col]))

  const query = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    VALUES ${placeholders}
    ON CONFLICT DO NOTHING
  `
  
  try {
    await pgPool.query(query, values)
    console.log(`Successfully migrated ${rows.length} rows into PostgreSQL ${tableName}.`)
  } catch (err: any) {
    if (err.code === '23503') {
      console.warn(`Foreign key violation in ${tableName}. Falling back to row-by-row insertion to skip orphans...`)
      let successCount = 0
      for (const row of rows) {
        const rowVals = columns.map(col => row[col])
        const rowQuery = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${columns.map((_, j) => `$${j + 1}`).join(', ')})
          ON CONFLICT DO NOTHING
        `
        try {
          await pgPool.query(rowQuery, rowVals)
          successCount++
        } catch (e) {
          // skip orphan
        }
      }
      console.log(`Successfully migrated ${successCount}/${rows.length} rows into PostgreSQL ${tableName} (skipped orphans).`)
    } else {
      throw err
    }
  }
}

const runMigration = async () => {
  try {
    console.log('Starting Migration: SQLite to PostgreSQL...')

    // 1. Delete existing data in PostgreSQL (Reverse Dependency Order)
    console.log('Clearing existing data in Postgres to avoid conflicts...')
    const tablesToClear = [
      'anomalies',
      'import_reports',
      'settlements',
      'expense_splits',
      'expenses',
      'group_memberships',
      'groups',
      'users',
      'audit_logs'
    ]
    for (const table of tablesToClear) {
      await pgPool.query(`DELETE FROM ${table}`)
    }

    // 2. Migrate Tables (Dependency Order)
    await migrateTable('users', ['uid', 'first_name', 'last_name', 'email', 'phone', 'avatar'])
    
    // Groups has members as string in SQLite but text[] in Postgres? 
    // Wait, let's read groups specially because of the schema differences.
    const sqliteGroups = await querySqlite('SELECT * FROM groups')
    if (sqliteGroups.length > 0) {
      console.log(`Migrating groups... Found ${sqliteGroups.length} rows.`)
      for (const g of sqliteGroups) {
        // Members in SQLite is JSON string serialized array, in Postgres it's text[]
        const membersArray = typeof g.members === 'string' ? JSON.parse(g.members) : g.members
        await pgPool.query(`
          INSERT INTO groups (id, name, members, icon, description, owner_uid, currency)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `, [g.id, g.name, membersArray, g.icon, g.description, g.owner_uid, g.currency])
      }
    }

    await migrateTable('group_memberships', ['id', 'group_id', 'user_uid', 'joined_at', 'left_at'])
    await migrateTable('expenses', ['id', 'group_id', 'description', 'amount', 'paid_by', 'split_type', 'date', 'category', 'currency', 'exchange_rate', 'is_anomaly', 'import_id'])
    await migrateTable('expense_splits', ['id', 'expense_id', 'user_uid', 'amount', 'type'])
    await migrateTable('settlements', ['id', 'group_id', 'paid_by', 'paid_to', 'amount', 'method', 'status', 'date'])
    await migrateTable('import_reports', ['id', 'group_id', 'date', 'rows_imported', 'issues_fixed', 'status'])
    await migrateTable('anomalies', ['id', 'import_id', 'row_number', 'issue_type', 'original_value', 'action_taken', 'final_status'])
    await migrateTable('audit_logs', ['id', 'entity_id', 'action', 'user_uid', 'timestamp', 'details'])

    console.log('Migration completed successfully!')
  } catch (err) {
    console.error('Migration failed:', err)
  } finally {
    sqliteDb.close()
    await pgPool.end()
  }
}

runMigration()

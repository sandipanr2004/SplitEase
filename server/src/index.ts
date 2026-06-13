import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDb, query, isPostgres } from './db'
import { authMiddleware, AuthenticatedRequest } from './middleware/auth'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middlewares
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Apply authentication middleware on all API routes except server health checks
app.use('/api', authMiddleware)

// --- API Endpoints ---

// 1. Register User Profile
app.post('/api/auth/register-profile', async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const { firstName, lastName, email, phone, avatar } = req.body

  try {
    await query(`
      INSERT INTO users (uid, first_name, last_name, email, phone, avatar)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (uid) DO UPDATE SET
        first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
        last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),
        email = COALESCE(NULLIF(EXCLUDED.email, ''), users.email),
        phone = COALESCE(NULLIF(EXCLUDED.phone, ''), users.phone),
        avatar = COALESCE(NULLIF(EXCLUDED.avatar, ''), users.avatar)
    `, [uid, firstName || '', lastName || '', email || '', phone || '', avatar || 'purple'])

    res.json({ success: true, uid })
  } catch (err: any) {
    console.error('Error registering profile:', err)
    res.status(500).json({ error: err.message })
  }
})

// 2. Fetch User Profile
app.get('/api/users/profile', async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const rows = await query('SELECT * FROM users WHERE uid = $1', [uid])
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' })
    }
    const user = rows[0]
    res.json({
      uid: user.uid,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar
    })
  } catch (err: any) {
    console.error('Error fetching profile:', err)
    res.status(500).json({ error: err.message })
  }
})

// 3. Save / Update Group Workspace
app.post('/api/groups', async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const { id, name, members, icon, description, currency } = req.body

  // Format members array for db drivers
  const membersDbValue = isPostgres ? members : JSON.stringify(members)

  try {
    await query(`
      INSERT INTO groups (id, name, members, icon, description, owner_uid, currency)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        members = EXCLUDED.members,
        icon = EXCLUDED.icon,
        description = EXCLUDED.description,
        currency = EXCLUDED.currency
    `, [id, name, membersDbValue, icon || 'home', description || '', uid, currency || 'USD'])

    res.json({ success: true, id })
  } catch (err: any) {
    console.error('Error saving group:', err)
    res.status(500).json({ error: err.message })
  }
})

// 4. Fetch User Workspaces
app.get('/api/groups', async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const rows = await query('SELECT * FROM groups WHERE owner_uid = $1', [uid])
    const groups = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      members: typeof row.members === 'string' ? JSON.parse(row.members) : row.members,
      icon: row.icon,
      description: row.description,
      ownerUid: row.owner_uid,
      currency: row.currency
    }))
    res.json(groups)
  } catch (err: any) {
    console.error('Error fetching groups:', err)
    res.status(500).json({ error: err.message })
  }
})

// 5. Delete Workspace
app.delete('/api/groups/:id', async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })
  
  const groupId = req.params.id

  try {
    // Delete group (cascade settings deletes dependent expenses)
    await query('DELETE FROM groups WHERE id = $1 AND owner_uid = $2', [groupId, uid])
    res.json({ success: true })
  } catch (err: any) {
    console.error('Error deleting group:', err)
    res.status(500).json({ error: err.message })
  }
})

// 6. Save / Update Expense log
app.post('/api/expenses', async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const { id, groupId, description, amount, paidBy, splitType, date, category, currency, exchangeRate } = req.body

  try {
    // Anomaly Detection: Check for identical amounts in the same group recently
    let isAnomaly = false
    try {
      const recent = await query('SELECT date FROM expenses WHERE group_id = $1 AND amount = $2 AND id != $3 LIMIT 1', [groupId, amount, id || ''])
      if (recent.length > 0) {
        // Simple heuristic: if same amount exists, flag as anomaly
        isAnomaly = true
      }
    } catch (e) {
      console.error('Anomaly detection error:', e)
    }

    const action = req.body._isUpdate ? 'UPDATE' : 'CREATE'

    await query(`
      INSERT INTO expenses (id, group_id, description, amount, paid_by, split_type, date, category, currency, exchange_rate, is_anomaly)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        amount = EXCLUDED.amount,
        paid_by = EXCLUDED.paid_by,
        split_type = EXCLUDED.split_type,
        date = EXCLUDED.date,
        category = EXCLUDED.category,
        currency = EXCLUDED.currency,
        exchange_rate = EXCLUDED.exchange_rate,
        is_anomaly = EXCLUDED.is_anomaly
    `, [id, groupId, description, amount, paidBy, splitType || 'equal', date, category, currency || 'USD', exchangeRate || 1.0, isAnomaly])

    // Audit log
    await query(`
      INSERT INTO audit_logs (id, entity_id, action, user_uid, timestamp, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [Date.now().toString() + Math.random().toString(36).substring(7), id, action, uid, new Date().toISOString(), `Expense ${action}: ${description} for ${amount}`])

    res.json({ success: true, id, isAnomaly })
  } catch (err: any) {
    console.error('Error saving expense:', err)
    res.status(500).json({ error: err.message })
  }
})

// Bulk Import Expenses (CSV Import Feature)
app.post('/api/expenses/bulk', async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const { groupId, expenses, report, anomalies } = req.body
  if (!Array.isArray(expenses)) return res.status(400).json({ error: 'Expected an array of expenses' })

  try {
    for (const exp of expenses) {
      await query(`
        INSERT INTO expenses (id, group_id, description, amount, paid_by, split_type, date, category, currency, exchange_rate, is_anomaly, import_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [exp.id, groupId, exp.description, exp.amount, exp.paidBy, exp.splitType || 'equal', exp.date, exp.category, exp.currency || 'USD', exp.exchangeRate || 1.0, false, report ? report.id : null])
    }
    
    // Save Import Report if provided
    if (report) {
      await query(`
        INSERT INTO import_reports (id, group_id, date, rows_imported, issues_fixed, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [report.id, groupId, report.date, report.rowsImported, report.issuesFixed, report.status])

      if (Array.isArray(anomalies)) {
        for (const anomaly of anomalies) {
          await query(`
            INSERT INTO anomalies (id, import_id, row_number, issue_type, original_value, action_taken, final_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [Date.now().toString() + Math.random().toString(36).substring(7), report.id, anomaly.rowNumber, anomaly.issueType, anomaly.originalValue || '', anomaly.actionTaken, anomaly.finalStatus])
        }
      }
    }

    // Audit log
    await query(`
      INSERT INTO audit_logs (id, entity_id, action, user_uid, timestamp, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [Date.now().toString(), groupId, 'BULK_CREATE', uid, new Date().toISOString(), `Bulk imported ${expenses.length} expenses`])

    res.json({ success: true, count: expenses.length })
  } catch (err: any) {
    console.error('Error bulk saving expenses:', err)
    res.status(500).json({ error: err.message })
  }
})

// Fetch Import Reports History
app.get('/api/imports', async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const groupId = req.query.groupId as string
  if (!groupId) return res.status(400).json({ error: 'groupId parameter is required' })

  try {
    const rows = await query('SELECT * FROM import_reports WHERE group_id = $1 ORDER BY date DESC', [groupId])
    res.json(rows)
  } catch (err: any) {
    console.error('Error fetching import reports:', err)
    res.status(500).json({ error: err.message })
  }
})

// 7. Fetch Group Expenses
app.get('/api/expenses', async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const groupId = req.query.groupId as string
  if (!groupId) return res.status(400).json({ error: 'groupId parameter is required' })

  try {
    const rows = await query('SELECT * FROM expenses WHERE group_id = $1 ORDER BY date DESC, id DESC', [groupId])
    const expenses = rows.map((row: any) => ({
      id: row.id,
      groupId: row.group_id,
      description: row.description,
      amount: parseFloat(row.amount),
      paidBy: row.paid_by,
      splitType: row.split_type,
      date: row.date,
      category: row.category,
      currency: row.currency || 'USD',
      exchangeRate: parseFloat(row.exchange_rate) || 1.0,
      isAnomaly: Boolean(row.is_anomaly),
      importId: row.import_id
    }))
    res.json(expenses)
  } catch (err: any) {
    console.error('Error fetching expenses:', err)
    res.status(500).json({ error: err.message })
  }
})

// 8. Delete Expense log
app.delete('/api/expenses/:id', async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const expenseId = req.params.id

  try {
    await query('DELETE FROM expenses WHERE id = $1', [expenseId])
    
    // Audit log
    await query(`
      INSERT INTO audit_logs (id, entity_id, action, user_uid, timestamp, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [Date.now().toString(), expenseId, 'DELETE', uid, new Date().toISOString(), `Deleted expense ${expenseId}`])

    res.json({ success: true })
  } catch (err: any) {
    console.error('Error deleting expense:', err)
    res.status(500).json({ error: err.message })
  }
})

// 9. Fetch Audit Logs
app.get('/api/groups/:id/audit-logs', async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const groupId = req.params.id
  try {
    // Currently fetching all logs loosely related, ideally join on group_id
    const rows = await query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50')
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// 10. Record Settlement
app.post('/api/settlements', async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.uid
  if (!uid) return res.status(401).json({ error: 'Unauthorized' })

  const { id, groupId, paidBy, paidTo, amount, method, date } = req.body
  try {
    await query(`
      INSERT INTO settlements (id, group_id, paid_by, paid_to, amount, method, status, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, groupId, paidBy, paidTo, amount, method, 'COMPLETED', date])
    
    // Audit log
    await query(`
      INSERT INTO audit_logs (id, entity_id, action, user_uid, timestamp, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [Date.now().toString(), groupId, 'SETTLEMENT', uid, new Date().toISOString(), `Settled ${amount} from ${paidBy} to ${paidTo}`])

    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// 11. Fetch Settlements
app.get('/api/settlements', async (req: AuthenticatedRequest, res) => {
  const groupId = req.query.groupId as string
  if (!groupId) return res.status(400).json({ error: 'groupId required' })
  try {
    const rows = await query('SELECT * FROM settlements WHERE group_id = $1 ORDER BY date DESC', [groupId])
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// 12. Update Member Join/Leave Status
app.post('/api/groups/:id/members', async (req: AuthenticatedRequest, res) => {
  const { userUid, joinedAt, leftAt } = req.body
  const groupId = req.params.id
  try {
    await query(`
      INSERT INTO group_memberships (id, group_id, user_uid, joined_at, left_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET left_at = EXCLUDED.left_at
    `, [Date.now().toString(), groupId, userUid, joinedAt, leftAt])
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// 13. Anomaly Dashboard Data
app.get('/api/anomalies/dashboard', async (req: AuthenticatedRequest, res) => {
  const groupId = req.query.groupId as string
  if (!groupId) return res.status(400).json({ error: 'groupId required' })

  try {
    // 1. Fetch live expenses to detect anomalies
    const expenses = await query('SELECT * FROM expenses WHERE group_id = $1', [groupId])
    
    const liveAnomalies: any[] = []
    
    // Check for negative/zero amounts
    expenses.forEach((exp: any) => {
      const amt = parseFloat(exp.amount)
      if (amt < 0) {
        liveAnomalies.push({
          id: `live-neg-${exp.id}`,
          groupName: groupId,
          expenseDescription: exp.description,
          amount: exp.amount,
          issueType: 'Negative Amount',
          severity: 'Critical',
          detectedDate: new Date().toISOString(),
          suggestedAction: 'Mark As Refund',
          status: 'Unresolved'
        })
      } else if (amt === 0) {
        liveAnomalies.push({
          id: `live-zero-${exp.id}`,
          groupName: groupId,
          expenseDescription: exp.description,
          amount: exp.amount,
          issueType: 'Zero Amount',
          severity: 'Low',
          detectedDate: new Date().toISOString(),
          suggestedAction: 'Remove',
          status: 'Unresolved'
        })
      }
    })

    // 2. Fetch imported anomalies from the database
    // We join with expenses to get description if possible, else use original_value
    const dbAnomalies = await query(`
      SELECT a.*, ir.group_id 
      FROM anomalies a
      JOIN import_reports ir ON a.import_id = ir.id
      WHERE ir.group_id = $1
    `, [groupId])

    const formattedDbAnomalies = dbAnomalies.map((a: any) => {
      let severity = 'Medium'
      if (a.issue_type.includes('Duplicate')) severity = 'High'
      if (a.issue_type.includes('Missing Required')) severity = 'Critical'
      if (a.issue_type.includes('Precision')) severity = 'Low'

      return {
        id: a.id,
        groupName: a.group_id,
        expenseDescription: a.original_value || 'Unknown',
        amount: 'N/A', // Assuming original_value is a JSON string or raw CSV row. For MVP, we pass N/A
        issueType: a.issue_type,
        severity: severity,
        detectedDate: new Date().toISOString(), // Mocking date
        suggestedAction: a.action_taken ? 'None' : 'Review',
        status: a.final_status === 'Imported' ? 'Resolved' : 'Unresolved'
      }
    })

    const allAnomalies = [...liveAnomalies, ...formattedDbAnomalies]

    res.json({
      summaryStats: {
        total: allAnomalies.length,
        duplicates: allAnomalies.filter(a => a.issueType.includes('Duplicate')).length,
        suspicious: allAnomalies.filter(a => a.severity === 'High').length,
        negativeZero: allAnomalies.filter(a => a.issueType === 'Negative Amount' || a.issueType === 'Zero Amount').length,
        currencyMismatch: allAnomalies.filter(a => a.issueType.includes('Currency')).length,
        membershipViolations: allAnomalies.filter(a => a.issueType.includes('Member')).length,
        resolved: allAnomalies.filter(a => a.status === 'Resolved').length
      },
      insights: [
        "Apartment 4B spending increased by 240% compared to last month.",
        "Dinner expense appears duplicated.",
        "Expense amount ₹50,000 exceeds group average by 600%."
      ],
      anomaliesList: allAnomalies
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// 14. Resolve Anomaly
app.post('/api/anomalies/resolve', async (req: AuthenticatedRequest, res) => {
  const { anomalyId, action } = req.body
  try {
    if (anomalyId.startsWith('live-')) {
      // In a real system, we might delete the expense or update it
      const expenseId = anomalyId.split('-').slice(2).join('-')
      if (action === 'Delete Duplicate' || action === 'Remove') {
        await query('DELETE FROM expenses WHERE id = $1', [expenseId])
      } else if (action === 'Mark As Refund') {
        await query('UPDATE expenses SET amount = ABS(CAST(amount AS NUMERIC)) WHERE id = $1', [expenseId])
      }
    } else {
      // Update DB anomaly
      await query('UPDATE anomalies SET final_status = $1, action_taken = $2 WHERE id = $3', ['Imported', action, anomalyId])
    }
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// 15. Timeline Dashboard Data
app.get('/api/groups/:id/timeline', async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.id
  try {
    const memberships = await query('SELECT * FROM group_memberships WHERE group_id = $1', [groupId])
    const expenses = await query('SELECT * FROM expenses WHERE group_id = $1', [groupId])
    const expenseSplits = await query('SELECT * FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE group_id = $1)', [groupId])
    const auditLogs = await query('SELECT * FROM audit_logs WHERE entity_id = $1 ORDER BY timestamp DESC', [groupId])

    const conflicts: any[] = []
    const prorated: any[] = []

    // Map memberships by user_uid
    const memMap: Record<string, any> = {}
    memberships.forEach((m: any) => memMap[m.user_uid] = m)

    // Detect conflicts and calculate proration
    expenses.forEach((exp: any) => {
      const splitsForExp = expenseSplits.filter((s: any) => s.expense_id === exp.id)
      const expDate = new Date(exp.date).getTime()
      
      let isRecurring = exp.description.toLowerCase().includes('rent') || exp.description.toLowerCase().includes('internet')
      if (isRecurring) {
         prorated.push({
           expenseId: exp.id,
           description: exp.description,
           amount: exp.amount,
           splits: splitsForExp.map((s: any) => {
             const mem = memMap[s.user_uid]
             let daysPresent = 30 // Simplify for MVP
             let notes = 'Full month'
             if (mem && mem.joined_at && new Date(mem.joined_at).getTime() > expDate - (15*86400000)) {
               daysPresent = 14
               notes = `Joined mid-month`
             }
             if (mem && mem.left_at && new Date(mem.left_at).getTime() < expDate + (15*86400000)) {
               daysPresent = 14
               notes = `Left mid-month`
             }
             return { userUid: s.user_uid, amount: s.amount, daysPresent, notes }
           })
         })
      }

      splitsForExp.forEach((s: any) => {
        const mem = memMap[s.user_uid]
        if (!mem) return // Member might be external
        
        let issue = null
        if (mem.joined_at && new Date(mem.joined_at).getTime() > expDate) {
          issue = 'Member joined after expense date'
        } else if (mem.left_at && new Date(mem.left_at).getTime() < expDate) {
          issue = 'Member left before expense date'
        }

        if (issue) {
          conflicts.push({
            id: `conflict-${s.id}`,
            issue,
            member: s.user_uid,
            expense: exp.description,
            expenseId: exp.id,
            splitId: s.id,
            suggestedFix: 'Recalculate Split',
            severity: 'Critical'
          })
        }
      })
    })

    res.json({
      memberships,
      conflicts,
      prorated,
      auditLogs
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// 16. Resolve Timeline Conflict
app.post('/api/groups/:id/timeline/resolve', async (req: AuthenticatedRequest, res) => {
  const { splitId, action, expenseId } = req.body
  const groupId = req.params.id
  try {
    if (action === 'Recalculate Split') {
      // Find all splits for this expense
      const splits = await query('SELECT * FROM expense_splits WHERE expense_id = $1', [expenseId])
      const totalAmount = splits.reduce((sum: number, s: any) => sum + parseFloat(s.amount), 0)
      
      // Delete the invalid split
      await query('DELETE FROM expense_splits WHERE id = $1', [splitId])
      
      // Recalculate remaining splits evenly
      const remainingSplits = await query('SELECT * FROM expense_splits WHERE expense_id = $1', [expenseId])
      if (remainingSplits.length > 0) {
        const newShare = (totalAmount / remainingSplits.length).toFixed(2)
        await query('UPDATE expense_splits SET amount = $1 WHERE expense_id = $2', [newShare, expenseId])
      }

      await query('INSERT INTO audit_logs (id, entity_id, action, user_uid, timestamp, details) VALUES ($1, $2, $3, $4, $5, $6)', 
        [Date.now().toString(), groupId, 'Split Recalculated', req.user?.uid || 'system', new Date().toISOString(), `Automatically excluded invalid member and adjusted splits for expense.`])
    } else if (action === 'Exclude Member') {
       await query('DELETE FROM expense_splits WHERE id = $1', [splitId])
    }
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Startup routine
app.listen(PORT, async () => {
  console.log(`SplitEase Backend Server running on port ${PORT}`)
  try {
    await initDb()
  } catch (err) {
    console.error('Database connection failed to initialize:', err)
  }
})

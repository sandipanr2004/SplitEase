import { auth, isMockMode } from './firebase'

const BASE_URL = import.meta.env.VITE_API_URL || ''

export interface UserProfile {
  uid: string
  firstName: string
  lastName: string
  avatar: string
  phone: string
  email: string
}

export interface GroupWorkspace {
  id: string
  name: string
  members: string[]
  icon: string
  description: string
  ownerUid: string
  currency?: string
}

export interface ExpenseItem {
  id: string
  groupId: string
  description: string
  amount: number
  paidBy: string
  splitType: string
  date: string
  category: string
  currency?: string
  exchangeRate?: number
  isAnomaly?: boolean
}

export interface AuditLog {
  id: string
  entity_id: string
  action: string
  user_uid: string
  timestamp: string
  details: string
}

export interface Settlement {
  id: string
  group_id: string
  paid_by: string
  paid_to: string
  amount: number
  method: string
  status: string
  date: string
}

export interface GroupMembership {
  id: string
  group_id: string
  user_uid: string
  joined_at: string
  left_at?: string
}

// Helper to construct request headers with the active user auth session token
const getHeaders = async () => {
  const token = auth.currentUser ? `mock-token-${auth.currentUser.uid}` : 'mock-token-guest'

  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }
}

// --- REST Client Adapters ---

export const saveUserProfile = async (uid: string, profile: Partial<UserProfile>): Promise<void> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/auth/register-profile', {
    method: 'POST',
    headers,
    body: JSON.stringify({ uid, ...profile })
  })
  if (!res.ok) {
    throw new Error('Failed to save user profile to backend')
  }
}

export const getUserProfile = async (_uid: string): Promise<UserProfile | null> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/users/profile', { headers })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error('Failed to fetch user profile from backend')
  }
  return res.json()
}

export const saveGroup = async (group: GroupWorkspace): Promise<void> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/groups', {
    method: 'POST',
    headers,
    body: JSON.stringify(group)
  })
  if (!res.ok) {
    throw new Error('Failed to save group workspace to backend')
  }
}

export const getGroups = async (_uid: string): Promise<GroupWorkspace[]> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/groups', { headers })
  if (!res.ok) {
    throw new Error('Failed to fetch user groups from backend')
  }
  return res.json()
}

export const saveExpense = async (expense: ExpenseItem): Promise<void> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/expenses', {
    method: 'POST',
    headers,
    body: JSON.stringify(expense)
  })
  if (!res.ok) {
    throw new Error('Failed to save expense log to backend')
  }
}

export const getExpenses = async (groupId: string): Promise<ExpenseItem[]> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/expenses?groupId=${groupId}`, { headers })
  if (!res.ok) {
    throw new Error('Failed to fetch group expenses from backend')
  }
  return res.json()
}

export const deleteExpense = async (expenseId: string): Promise<void> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/expenses/${expenseId}`, {
    method: 'DELETE',
    headers
  })
  if (!res.ok) {
    throw new Error('Failed to delete expense from backend')
  }
}

export const deleteGroup = async (groupId: string): Promise<void> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}`, {
    method: 'DELETE',
    headers
  })
  if (!res.ok) {
    throw new Error('Failed to delete group workspace from backend')
  }
}

// --- Advanced Features Client APIs ---

export const uploadBulkExpenses = async (groupId: string, expenses: ExpenseItem[], report?: any, anomalies?: any[]): Promise<number> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/expenses/bulk', {
    method: 'POST',
    headers,
    body: JSON.stringify({ groupId, expenses, report, anomalies })
  })
  if (!res.ok) {
    let errorMsg = 'Failed to bulk upload expenses'
    try {
      const errData = await res.json()
      if (errData.error) errorMsg = errData.error
    } catch (e) {
      // ignore JSON parse error
    }
    throw new Error(errorMsg)
  }
  const data = await res.json()
  return data.count
}

export const getImportHistory = async (groupId: string): Promise<any[]> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/imports?groupId=${groupId}`, { headers })
  if (!res.ok) {
    throw new Error('Failed to fetch import history')
  }
  return res.json()
}

export const getAuditLogs = async (groupId: string): Promise<AuditLog[]> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/audit-logs`, { headers })
  if (!res.ok) {
    throw new Error('Failed to fetch audit logs')
  }
  return res.json()
}

export const recordSettlement = async (settlement: Partial<Settlement>): Promise<void> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/settlements', {
    method: 'POST',
    headers,
    body: JSON.stringify(settlement)
  })
  if (!res.ok) {
    throw new Error('Failed to record settlement')
  }
}

export const getSettlements = async (groupId: string): Promise<Settlement[]> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/settlements?groupId=${groupId}`, { headers })
  if (!res.ok) {
    throw new Error('Failed to fetch settlements')
  }
  return res.json()
}

export const updateMemberTimeline = async (groupId: string, userUid: string, joinedAt: string, leftAt: string | null): Promise<void> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/members`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userUid, joinedAt, leftAt })
  })
  if (!res.ok) throw new Error('Failed to update member timeline')
}

// --- Anomaly Detection Clients ---

export const getAnomalyDashboardData = async (groupId: string): Promise<any> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/anomalies/dashboard?groupId=${groupId}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch anomaly dashboard data')
  return res.json()
}

export const resolveAnomaly = async (anomalyId: string, action: string): Promise<void> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/anomalies/resolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ anomalyId, action })
  })
  if (!res.ok) throw new Error('Failed to resolve anomaly')
}

// --- Timeline Dashboard Clients ---

export const getGroupTimelineData = async (groupId: string): Promise<any> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/timeline`, { headers })
  if (!res.ok) throw new Error('Failed to fetch timeline data')
  return res.json()
}

export const resolveTimelineConflict = async (groupId: string, splitId: string, expenseId: string, action: string): Promise<void> => {
  const headers = await getHeaders()
  const res = await fetch(`${BASE_URL}/api/groups/${groupId}/timeline/resolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ splitId, expenseId, action })
  })
  if (!res.ok) throw new Error('Failed to resolve timeline conflict')
}

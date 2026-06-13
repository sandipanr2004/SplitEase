import React from 'react'
import { CsvImportModal } from './components/CsvImportModal'
import { SettlementModal } from './components/SettlementModal'
import { AuditLogDrawer } from './components/AuditLogDrawer'
import {
  FeatureCsvImport,
  FeatureMultiCurrency,
  FeatureTraceability,
  FeatureSettlement
} from './components/FeaturePages'
import { FeatureAnomalyDashboard } from './components/FeatureAnomalyDashboard'
import { FeatureMemberTimelineDashboard } from './components/FeatureMemberTimelineDashboard'
import { FeatureImportHistory } from './components/FeatureImportHistory'
import { ProfileModal } from './components/ProfileModal'
import { ReactLenis } from 'lenis/react'
import 'lenis/dist/lenis.css'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Eye, EyeOff, Check, Loader2, Users, ChevronRight, Sparkles, HelpCircle, Send, Plus, Search, Trash2, X, DollarSign, TrendingUp, TrendingDown, Coffee, Home as HomeIcon, Plane, BookOpen, Phone, FileSpreadsheet, AlertTriangle, Globe, UserPlus, Activity, CreditCard } from 'lucide-react'
import {
  auth,
  googleProvider,
  createRecaptchaVerifier,
  signInWithPopup,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from './firebase'
import type { ConfirmationResult } from 'firebase/auth'
import {
  saveUserProfile,
  getUserProfile,
  saveGroup,
  getGroups,
  saveExpense,
  getExpenses,
  deleteExpense,
} from './db'

// Stylized "halo" logo mark made of two interlocking rounded squares
const LogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    fill="currentColor"
    {...props}
  >
    <path d="M 128.005 191.173 C 128.448 156.208 156.93 128 192 128 L 192 64 L 128 64 C 128 99.346 99.346 128 64 128 L 64 192 L 128 192 Z M 192 256 L 64 256 C 28.654 256 0 227.346 0 192 L 0 64 L 64 64 L 64 0 L 192 0 C 227.346 0 256 28.654 256 64 L 256 192 L 192 192 Z" />
  </svg>
)

// Custom hook to animate numbers smoothly
const useAnimatedValue = (target: number, duration = 800) => {
  const [current, setCurrent] = React.useState(0)
  React.useEffect(() => {
    let start: number | null = null
    const initial = current
    const diff = target - initial
    if (diff === 0) return

    let myReq: number
    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = timestamp - start
      const percent = Math.min(progress / duration, 1)
      
      // Easing function: easeOutQuad
      const easeOutQuad = percent * (2 - percent)
      setCurrent(initial + diff * easeOutQuad)
      
      if (progress < duration) {
        myReq = requestAnimationFrame(step)
      } else {
        setCurrent(target)
      }
    }
    
    myReq = requestAnimationFrame(step)
    return () => cancelAnimationFrame(myReq)
  }, [target])
  
  return current
}

interface GrowthMilestone {
  year: number
  users: string
  usersVal: number
  settled: string
  settledVal: number // in millions
  groups: string
  groupsVal: number // in thousands
  milestone: string
  desc: string
}

const growthData: GrowthMilestone[] = [
  { year: 2021, users: '250K', usersVal: 250000, settled: '$15M', settledVal: 15, groups: '80K', groupsVal: 80, milestone: 'Platform Launch', desc: 'Started with simple dinner bill splits among college roommates.' },
  { year: 2022, users: '1.2M', usersVal: 1200000, settled: '$110M', settledVal: 110, groups: '420K', groupsVal: 420, milestone: 'Roommate Adoption', desc: 'Introduced recurring rent splits and household utility tracking.' },
  { year: 2023, users: '3.5M', usersVal: 3500000, settled: '$380M', settledVal: 380, groups: '1.1M', groupsVal: 1100, milestone: 'Travel Groups', desc: 'Launched multi-currency trip logs and shared itineraries.' },
  { year: 2024, users: '6.8M', usersVal: 6800000, settled: '$850M', settledVal: 850, groups: '2.3M', groupsVal: 2300, milestone: 'SplitEase Pro Launch', desc: 'Added receipt scanning (OCR) and smart debt simplification.' },
  { year: 2025, users: '9.7M', usersVal: 9700000, settled: '$1.3B', settledVal: 1300, groups: '3.4M', groupsVal: 3400, milestone: 'SplitEase Pay Card', desc: 'Released virtual debit cards for instant, split-at-swipe purchases.' },
  { year: 2026, users: '12.4M', usersVal: 12400000, settled: '$1.8B', settledVal: 1800, groups: '4.2M', groupsVal: 4200, milestone: 'Global Scale', desc: 'Real-time bank settlements and cross-border group expenses.' }
]

const defaultMockGroups = [
  { id: 'Apartment 4B', name: 'Apartment 4B', members: ['Alice', 'Bob', 'Charlie'], icon: 'home', description: 'Rent, groceries, utilities, and household expenses.' },
  { id: 'Summer Trip 2026', name: 'Summer Trip 2026', members: ['David', 'Emma', 'Frank', 'Grace'], icon: 'plane', description: 'Flights, hotels, restaurants, and activity bookings.' },
  { id: 'Office Lunch Crew', name: 'Office Lunch Crew', members: ['Alex', 'Ben', 'Chris'], icon: 'coffee', description: 'Daily lunch splits and coffee orders.' }
]

const defaultMockExpenses = [
  { id: '1', groupId: 'Apartment 4B', description: 'May Apartment Rent', amount: 1500, paidBy: 'Alice', splitType: 'equal', date: '2026-05-01', category: 'Rent' },
  { id: '2', groupId: 'Apartment 4B', description: 'Electricity & Gas Bill', amount: 120, paidBy: 'Bob', splitType: 'equal', date: '2026-05-05', category: 'Utilities' },
  { id: '3', groupId: 'Summer Trip 2026', description: 'Airbnb Resort Booking', amount: 960, paidBy: 'David', splitType: 'equal', date: '2026-06-01', category: 'Lodging' },
  { id: '4', groupId: 'Summer Trip 2026', description: 'Rental SUV', amount: 280, paidBy: 'Emma', splitType: 'equal', date: '2026-06-03', category: 'Transport' },
  { id: '5', groupId: 'Office Lunch Crew', description: 'Friday Pizza Party', amount: 60, paidBy: 'Alex', splitType: 'equal', date: '2026-06-05', category: 'Food' }
]

function App() {

  const [showAuth, setShowAuth] = React.useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false)
  const [videoLoaded, setVideoLoaded] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState<'home' | 'features' | 'groups' | 'expenses' | 'balances' | 'support' | 'about' | 'blog' | 'pricing' | 'legal' | 'import-history' | 'feature-csv' | 'feature-anomaly' | 'feature-currency' | 'feature-members' | 'feature-traceability' | 'feature-settlement'>('home')

  // User and Auth profile session state
  const [user, setUser] = React.useState<any>(null)
  const [userProfile, setUserProfile] = React.useState<any>(null)

  // Active group selected in Groups tab
  const [activeGroupId, setActiveGroupId] = React.useState('Apartment 4B')
  const [isEditingGroup, setIsEditingGroup] = React.useState(false)
  const [editGroupForm, setEditGroupForm] = React.useState({ name: '', description: '' })

  // Auth-protected navigation
  const navigateTo = (page: string) => {
    const publicPages = ['home', 'features', 'support', 'about', 'blog', 'pricing', 'legal']
    if (!user && !publicPages.includes(page)) {
      setAuthMode('signup')
      setShowAuth(true)
      return
    }
    setCurrentPage(page as any)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Groups and All Expenses Data
  const [groups, _setGroups] = React.useState<any[]>([])
  const [allExpenses, setAllExpenses] = React.useState<any[]>([])
  const [settlements, setSettlements] = React.useState<any[]>([])
  const [selectedTraceMember, setSelectedTraceMember] = React.useState<string | null>(null)

  // Derived active group expenses list
  const expenses = allExpenses.filter(e => e.groupId === activeGroupId)

  const saveNewExpense = async (newExpenseObj: any) => {
    if (user) {
      try {
        await saveExpense(newExpenseObj)
      } catch (err) {
        console.error("Failed to save expense in db", err)
      }
    }
    setAllExpenses(prev => [newExpenseObj, ...prev])
  }

  const removeExpense = async (expenseId: string) => {
    if (user) {
      try {
        await deleteExpense(expenseId)
      } catch (err) {
        console.error("Failed to delete expense in db", err)
      }
    }
    setAllExpenses(prev => prev.filter(e => e.id !== expenseId))
  }

  const refreshExpenses = async () => {
    if (user) {
      try {
        const userGroups = await getGroups(user.uid)
        if (userGroups.length > 0) {
          const fetchedExpenses: any[] = []
          for (const g of userGroups) {
            const groupExps = await getExpenses(g.id)
            fetchedExpenses.push(...groupExps)
          }
          setAllExpenses(fetchedExpenses)
        }
      } catch (err) {
        console.error("Failed to refresh expenses", err)
      }
    }
  }

  const resetToDefaultMockData = () => {
    _setGroups(defaultMockGroups)
    setAllExpenses(defaultMockExpenses)
    setActiveGroupId('Apartment 4B')
  }

  // Listen to Auth State Changes
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser: any) => {
      setUser(currentUser)
      if (currentUser) {
        try {
          const profile = await getUserProfile(currentUser.uid)
          setUserProfile(profile)

          const userGroups = await getGroups(currentUser.uid)
          if (userGroups.length > 0) {
            _setGroups(userGroups)
            
            // Load all expenses for all groups of this user
            const fetchedExpenses: any[] = []
            for (const g of userGroups) {
              const groupExps = await getExpenses(g.id)
              fetchedExpenses.push(...groupExps)
            }
            setAllExpenses(fetchedExpenses)

            // If current activeGroupId is not in the loaded groups, switch to the first one
            const activeExists = userGroups.some((g: any) => g.id === activeGroupId)
            if (!activeExists) {
              setActiveGroupId(userGroups[0].id)
            }
          } else {
            _setGroups([])
            setAllExpenses([])
          }
        } catch (err) {
          console.error("Failed to load user data on auth change", err)
        }
      } else {
        setUserProfile(null)
        resetToDefaultMockData()
        const publicPages = ['home', 'features', 'support', 'about', 'blog', 'pricing', 'legal']
        if (!publicPages.includes(currentPage)) {
          setCurrentPage('home')
        }
      }
    })
    return () => unsubscribe()
  }, [])

  // Expenses page search query
  const [expenseSearch, setExpenseSearch] = React.useState('')

  // Add Expense form modal states
  const [showAddExpenseModal, setShowAddExpenseModal] = React.useState(false)
  const [newExpenseForm, setNewExpenseForm] = React.useState({
    description: '',
    amount: '',
    paidBy: '',
    groupId: 'Apartment 4B',
    category: 'Food',
    currency: 'USD',
    exchangeRate: '1.0'
  })

  // Advanced feature states
  const [isCsvModalOpen, setIsCsvModalOpen] = React.useState(false)
  const [isSettlementModalOpen, setIsSettlementModalOpen] = React.useState(false)
  const [isSettlementLedgerOpen, setIsSettlementLedgerOpen] = React.useState(false)
  const [isAuditLogOpen, setIsAuditLogOpen] = React.useState(false)

  // Support Form ticket submission states
  const [supportMessage, setSupportMessage] = React.useState({
    name: '',
    email: '',
    subject: 'General',
    message: ''
  })
  const [supportSubmitted, setSupportSubmitted] = React.useState(false)

  // Expandable FAQ state
  const [expandedFaqIndex, setExpandedFaqIndex] = React.useState<number | null>(null)

  // Recalculates individual balances dynamically based on the current expenses array
  const getBalancesByGroup = (groupId: string) => {
    const group = groups.find((g: any) => g.id === groupId)
    if (!group) return []

    const groupExpenses = expenses.filter(e => e.groupId === groupId)
    const membersCount = group.members.length
    
    // Initialize member balances to 0
    const balancesMap: Record<string, number> = {}
    group.members.forEach((m: string) => {
      balancesMap[m] = 0
    })

    // Calculate total paid and total share
    groupExpenses.forEach(exp => {
      const share = exp.amount / membersCount
      group.members.forEach((m: string) => {
        if (m === exp.paidBy) {
          balancesMap[m] += (exp.amount - share) // paid total amount minus their own share
        } else {
          balancesMap[m] -= share // owe their share
        }
      })
    })

    const groupSettlements = settlements.filter(s => s.group_id === groupId)
    groupSettlements.forEach(s => {
      balancesMap[s.paid_by] += s.amount
      balancesMap[s.paid_to] -= s.amount
    })

    return group.members.map((memberName: string) => ({
      name: memberName,
      balance: balancesMap[memberName]
    }))
  }

  // Recalculate net balances across all groups (Global view)
  const getGlobalBalances = () => {
    const balanceRecords: Array<{ name: string; groupName: string; balance: number }> = []
    
    groups.forEach((g: any) => {
      const groupBalances = getBalancesByGroup(g.id)
      groupBalances.forEach((record: { name: string; balance: number }) => {
        if (record.balance !== 0) {
          balanceRecords.push({
            name: record.name,
            groupName: g.name,
            balance: record.balance
          })
        }
      })
    })
    
    return balanceRecords
  }

  // Settle up function: removes all expenses for the selected group from database and state
  const handleSettleUpGroup = async (groupId: string) => {
    if (user) {
      try {
        const groupExps = allExpenses.filter(e => e.groupId === groupId)
        for (const exp of groupExps) {
          await deleteExpense(exp.id)
        }
      } catch (err) {
        console.error("Failed to settle up group", err)
      }
    }
    setAllExpenses(prev => prev.filter(e => e.groupId !== groupId))
  }

  // Global settle up: clears all expenses from database and state
  const handleSettleUpGlobal = async () => {
    if (user) {
      try {
        for (const exp of allExpenses) {
          await deleteExpense(exp.id)
        }
      } catch (err) {
        console.error("Failed to settle all expenses", err)
      }
    }
    setAllExpenses([])
  }

  // Add a new expense log
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newExpenseForm.description || !newExpenseForm.amount || !newExpenseForm.paidBy) return

    const expenseAmount = parseFloat(newExpenseForm.amount)
    if (isNaN(expenseAmount) || expenseAmount <= 0) return

    const newExpenseId = 'exp-' + Math.random().toString(36).substr(2, 9)
    const newExpenseObj = {
      id: newExpenseId,
      groupId: newExpenseForm.groupId,
      description: newExpenseForm.description,
      amount: expenseAmount,
      paidBy: newExpenseForm.paidBy,
      splitType: 'equal',
      date: new Date().toISOString().split('T')[0],
      category: newExpenseForm.category
    }

    await saveNewExpense(newExpenseObj)
    setShowAddExpenseModal(false)
    setNewExpenseForm({
      description: '',
      amount: '',
      paidBy: '',
      groupId: newExpenseForm.groupId,
      category: 'Food',
      currency: 'USD',
      exchangeRate: '1.0'
    })
  }

  const [authMode, setAuthMode] = React.useState<'login' | 'signup' | 'forgot'>('signup')
  const [signupStep, setSignupStep] = React.useState(1)
  const [loginStep, setLoginStep] = React.useState(1)
  const [showPassword, setShowPassword] = React.useState(false)
  const [authLoading, setAuthLoading] = React.useState(false)
  const [authError, setAuthError] = React.useState('')
  const [forgotEmail, setForgotEmail] = React.useState('')
  const [forgotSuccess, setForgotSuccess] = React.useState(false)

  // Phone OTP sub-flow
  const [phoneStep, setPhoneStep] = React.useState<'input' | 'otp'>('input')
  const [phoneNumber, setPhoneNumber] = React.useState('')
  const [otpDigits, setOtpDigits] = React.useState(['', '', '', '', '', ''])
  const [showPhoneFlow, setShowPhoneFlow] = React.useState(false)
  const confirmationRef = React.useRef<ConfirmationResult | null>(null)
  const otpRefs = React.useRef<(HTMLInputElement | null)[]>([])

  const friendlyError = (code: string) => {
    const map: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/invalid-phone-number': 'Invalid phone number. Use format: +1 234 567 8900.',
      'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
      'auth/invalid-verification-code': 'Incorrect OTP code. Please try again.',
      'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
      'auth/network-request-failed': 'Network error. Check your connection.',
    }
    return map[code] || 'Something went wrong. Please try again.'
  }

  const handleGoogleSignIn = async () => {
    setAuthLoading(true)
    setAuthError('')
    try {
      const credential = await signInWithPopup(auth, googleProvider)
      if (authMode === 'signup' && credential.user) {
        const displayName = credential.user.displayName || 'Google User'
        const parts = displayName.split(' ')
        const firstName = parts[0] || 'Google'
        const lastName = parts.slice(1).join(' ') || 'User'
        await saveUserProfile(credential.user.uid, {
          uid: credential.user.uid,
          firstName,
          lastName,
          email: credential.user.email || '',
          phone: '',
          avatar: 'purple'
        })
        setSignupStep(2)
      } else if (authMode === 'signup') {
        setSignupStep(2)
      } else {
        setLoginStep(2)
      }
    } catch (err: any) {
      setAuthError(friendlyError(err.code))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signupForm.firstName || !signupForm.email || signupForm.password.length < 8) return
    setAuthLoading(true)
    setAuthError('')
    try {
      const credential = await createUserWithEmailAndPassword(auth, signupForm.email, signupForm.password)
      if (credential.user) {
        await saveUserProfile(credential.user.uid, {
          uid: credential.user.uid,
          firstName: signupForm.firstName,
          lastName: signupForm.lastName,
          email: signupForm.email,
          phone: '',
          avatar: 'purple'
        })
      }
      setSignupStep(2)
    } catch (err: any) {
      setAuthError(friendlyError(err.code))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginForm.email || loginForm.password.length < 8) return
    setAuthLoading(true)
    setAuthError('')
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password)
      setLoginStep(2)
    } catch (err: any) {
      setAuthError(friendlyError(err.code))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail) return
    setAuthLoading(true)
    setAuthError('')
    setForgotSuccess(false)
    try {
      await sendPasswordResetEmail(auth, forgotEmail)
      setForgotSuccess(true)
    } catch (err: any) {
      setAuthError(friendlyError(err.code))
    } finally {
      setAuthLoading(false)
    }
  }


  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) return
    setAuthLoading(true)
    setAuthError('')
    try {
      const verifier = createRecaptchaVerifier('recaptcha-container')
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier)
      confirmationRef.current = result
      setPhoneStep('otp')
    } catch (err: any) {
      setAuthError(friendlyError(err.code))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    const code = otpDigits.join('')
    if (code.length !== 6) return
    setAuthLoading(true)
    setAuthError('')
    try {
      const credential = await confirmationRef.current?.confirm(code)
      if (authMode === 'signup' && credential?.user) {
        await saveUserProfile(credential.user.uid, {
          uid: credential.user.uid,
          firstName: 'Phone',
          lastName: 'User',
          email: '',
          phone: credential.user.phoneNumber || phoneNumber,
          avatar: 'purple'
        })
        setSignupStep(2)
      } else if (authMode === 'signup') {
        setSignupStep(2)
      } else {
        setLoginStep(2)
      }
    } catch (err: any) {
      setAuthError(friendlyError(err.code))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth.currentUser) return
    setAuthLoading(true)
    setAuthError('')
    try {
      const activeUser = auth.currentUser
      // 1. Update user profile details
      await saveUserProfile(activeUser.uid, {
        avatar: signupForm.avatar,
        phone: signupForm.phone || activeUser.phoneNumber || ''
      })
      
      // Fetch latest profile state to update React state
      const profile = await getUserProfile(activeUser.uid)
      setUserProfile(profile)
      
      // 2. Create the first workspace/group
      const newGroupId = 'group-' + Math.random().toString(36).substr(2, 9)
      const userDisplayName = profile ? `${profile.firstName} ${profile.lastName}` : 'You'
      const newGroup = {
        id: newGroupId,
        name: signupForm.workspaceName || 'My First Group',
        members: [userDisplayName, 'Alice', 'Bob'],
        icon: 'home',
        description: 'Primary workspace created during signup.',
        ownerUid: activeUser.uid,
        currency: signupForm.currency || 'USD'
      }
      
      await saveGroup(newGroup)
      
      // Update local groups state
      const userGroups = await getGroups(activeUser.uid)
      _setGroups(userGroups)
      setActiveGroupId(newGroupId)
      
      // Go to final success transition step
      setAuthMode('login')
      setLoginStep(3)
    } catch (err: any) {
      setAuthError(friendlyError(err.code || err.message))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = digit
    setOtpDigits(newDigits)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }
  const [activeYearIndex, setActiveYearIndex] = React.useState(5)
  const activeYear = growthData[activeYearIndex]
  const animatedUsers = useAnimatedValue(activeYear.usersVal)
  const animatedSettled = useAnimatedValue(activeYear.settledVal)
  const animatedGroups = useAnimatedValue(activeYear.groupsVal)

  const formatUsersVal = (val: number) => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1) + 'M'
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(0) + 'K'
    }
    return Math.floor(val).toString()
  }

  const formatSettledVal = (val: number) => {
    if (val >= 1000) {
      return '$' + (val / 1000).toFixed(1) + 'B'
    }
    return '$' + Math.floor(val) + 'M'
  }

  const formatGroupsVal = (val: number) => {
    if (val >= 1000) {
      return (val / 1000).toFixed(1) + 'M'
    }
    return Math.floor(val) + 'K'
  }


  // Signup Form Fields
  const [signupForm, setSignupForm] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    workspaceName: '',
    currency: 'USD',
    avatar: 'purple',
    phone: '',
  })

  // Login Form Fields
  const [loginForm, setLoginForm] = React.useState({
    email: '',
    password: '',
    selectedWorkspace: '',
  })



  const toggleAuthMode = (mode: 'login' | 'signup') => {
    setAuthMode(mode)
    setSignupStep(1)
    setLoginStep(1)
    setShowPassword(false)
  }

  const handleCloseAuth = () => {
    setShowAuth(false)
    setSignupStep(1)
    setLoginStep(1)
    setShowPassword(false)
    setAuthError('')
    setShowPhoneFlow(false)
    setPhoneStep('input')
    setPhoneNumber('')
    setOtpDigits(['', '', '', '', '', ''])
  }

  // Prevent scroll when auth overlay is open
  React.useEffect(() => {
    if (showAuth) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showAuth])

  // Automatically close auth after 1.5 seconds on login step 3
  React.useEffect(() => {
    if (authMode === 'login' && loginStep === 3 && showAuth) {
      const timer = setTimeout(() => {
        handleCloseAuth()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [loginStep, authMode, showAuth])

  const backerBrands = [
    { name: 'Expense Tracking', style: { fontFamily: '"Times New Roman", serif', fontWeight: 400, letterSpacing: '0.02em', fontSize: '14px' } },
    { name: 'Group Management', style: { fontFamily: '"Arial Black", sans-serif', fontWeight: 900, letterSpacing: '0.08em', fontSize: '16px' } },
    { name: 'Balance Calculation', style: { fontFamily: 'Impact, sans-serif', fontWeight: 700, letterSpacing: '0.05em', fontSize: '18px' } },
    { name: 'Debt Settlement', style: { fontFamily: 'Georgia, serif', fontWeight: 600, letterSpacing: '-0.02em', fontSize: '17px' } },
    { name: 'Expense History', style: { fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 700, letterSpacing: '-0.01em', fontSize: '15px' } },
    { name: 'Real-time Updates', style: { fontFamily: 'Verdana, sans-serif', fontWeight: 700, letterSpacing: '0.06em', fontSize: '14px', textTransform: 'uppercase' as const } },
    { name: 'Payment Records', style: { fontFamily: '"Courier New", monospace', fontWeight: 700, letterSpacing: '0.18em', fontSize: '14px' } },
    { name: 'Shared Budgets', style: { fontFamily: 'Palatino, "Book Antiqua", serif', fontWeight: 500, letterSpacing: '0.03em', fontSize: '15px' } }
  ]


  return (
    <ReactLenis root>
      <div className={`flex flex-col w-full min-h-screen text-black ${currentPage === 'home' ? 'bg-[#F5F5F5]' : 'bg-transparent'}`}>
        {currentPage !== 'home' && (
          <video
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_055001_8e16d972-3b2b-441c-86ad-2901a54682f9.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
          />
        )}
      {/* Scoped CSS animations for marquees */}
      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 22s linear infinite;
        }

        @keyframes backers-marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .backers-track {
          display: flex;
          width: max-content;
          animation: backers-marquee 30s linear infinite;
        }
      `}</style>

      {/* Global Sticky/Absolute Navbar */}
      <nav className={`${
        currentPage === 'home' 
          ? 'absolute top-0 left-0 right-0 z-30 bg-transparent border-b border-transparent' 
          : 'sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-black/[0.04] shadow-xs'
      } px-6 py-4 transition-all duration-200`}>
         <div className="max-w-[88rem] mx-auto flex items-center justify-between w-full">
            {/* Left Brand */}
            <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => navigateTo('home')}>
              <LogoIcon className="w-7 h-7 text-black" />
              <span className="text-2xl font-bold tracking-tight text-black font-sans">
                SplitEase
              </span>
            </div>

            {/* Center Navigation Menu */}
            <div className="hidden md:flex items-center gap-1">
              {['Home', 'Features', 'Groups', 'Expenses', 'Balances', 'Support'].map((link) => {
                const tab = link.toLowerCase() as any
                const isActive = currentPage === tab
                return (
                  <motion.button
                    key={link}
                    onClick={() => navigateTo(tab)}
                    animate={{
                      backgroundColor: isActive ? '#EDE9FE' : 'rgba(0,0,0,0)',
                      color: isActive ? '#6D28D9' : '#4B5563',
                    }}
                    whileHover={{
                      backgroundColor: '#EDE9FE',
                      color: '#6D28D9',
                      scale: 1.04,
                    }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="text-base font-bold px-4 py-2 rounded-full cursor-pointer"
                    style={{ letterSpacing: '-0.01em' }}
                  >
                    {link}
                  </motion.button>
                )
              })}
            </div>

            {/* Right CTA / User Session Dropdown */}
            <div>
              {user ? (
                <div className="flex items-center gap-4">
                  {/* User Profile Badge */}
                  <div 
                    onClick={() => setIsProfileModalOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-black/[0.03] rounded-full border border-black/[0.05] shadow-xs select-none cursor-pointer hover:bg-black/[0.06] transition-colors"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
                      userProfile?.avatar === 'indigo' ? 'bg-indigo-500' :
                      userProfile?.avatar === 'emerald' ? 'bg-emerald-500' :
                      userProfile?.avatar === 'amber' ? 'bg-amber-500' : 'bg-purple-500'
                    }`}>
                      {userProfile?.firstName?.charAt(0).toUpperCase() || user.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 max-w-[120px] truncate">
                      {userProfile?.firstName 
                        ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() 
                        : (user.displayName && user.displayName !== user.email?.split('@')[0] ? user.displayName.split(' ')[0] : 'User')}
                    </span>
                  </div>
                  
                </div>
              ) : (
                <button 
                  onClick={() => { setAuthMode('signup'); setShowAuth(true); }}
                  className="bg-black text-white text-base font-semibold px-7 py-2.5 rounded-full hover:bg-gray-800 transition-colors duration-200 cursor-pointer shadow-md select-none"
                >
                  Get Started
                </button>
              )}
            </div>
         </div>
      </nav>

      {/* Main Pages Switcher */}
      <AnimatePresence mode="wait">
        {currentPage === 'home' ? (
          <motion.div
            key="home-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col w-full"
          >
            {/* 1. Hero Section Container (h-screen) */}
            <div className="h-screen w-full flex flex-col overflow-hidden relative bg-[#F5F5F5]">
              {/* Background looping Video (Autoplay, muted, loop, playsInline) */}
              {/* Animated gradient placeholder — visible until video buffers in */}
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: videoLoaded ? 0 : 1 }}
                transition={{ duration: 1.8, ease: 'easeInOut' }}
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{ background: 'linear-gradient(135deg, #F0EFFE 0%, #DDD5FB 40%, #C4B5FD 70%, #A78BFA 100%)' }}
              >
                <div className="absolute top-[15%] left-[5%] w-[520px] h-[520px] rounded-full blur-[130px] bg-purple-400/25 animate-pulse" />
                <div className="absolute bottom-[10%] right-[5%] w-[420px] h-[420px] rounded-full blur-[110px] bg-indigo-400/20 animate-pulse" style={{ animationDelay: '0.8s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[100px] bg-violet-300/15 animate-pulse" style={{ animationDelay: '1.5s' }} />
              </motion.div>
              <video
                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_161253_c72b1869-400f-45ed-ac0c-52f68c2ed5bd.mp4"
                autoPlay
                muted
                loop
                playsInline
                onLoadedData={() => setVideoLoaded(true)}
                className={`object-cover absolute inset-0 w-full h-full z-0 pointer-events-none transition-opacity duration-[2000ms] ease-in-out ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
              />

              {/* Hero Section Content Overlay */}
              <div className="flex-1 px-6 pt-32 pb-8 flex flex-col justify-start w-full max-w-[88rem] mx-auto relative z-10">
                
                {/* Headline + Subtitle + CTA */}
                <div className="flex flex-col items-start justify-start pt-12 md:pt-20">
                  {/* Title */}
                  <h1 
                    className="text-black text-5xl md:text-7xl font-semibold leading-[1.05] max-w-2xl mb-5 select-none"
                    style={{ letterSpacing: '-0.04em' }}
                  >
                    Track Expenses<br />Together
                  </h1>

                  {/* Subtitle */}
                  <p 
                    className="text-black/70 text-base md:text-lg max-w-md mb-8 leading-relaxed select-none"
                    style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
                  >
                    Manage shared expenses, split bills fairly, track balances, and settle debts effortlessly with friends, roommates, teams, and travel groups.
                  </p>

                  {/* Join us Button */}
                  <button 
                    onClick={() => { setAuthMode('signup'); setShowAuth(true); }}
                    className="inline-flex items-center gap-3 bg-black text-white text-base md:text-lg font-semibold pl-8 pr-2 py-2 rounded-full hover:bg-gray-800 transition-colors duration-200 cursor-pointer shadow-md"
                  >
                    <span>Create Group</span>
                    <span className="bg-white rounded-full p-2 flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 text-black" />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area (with soft lavender gradient texture and blur blobs) */}
            <div className="relative bg-gradient-to-b from-[#F5F5F5] via-[#EDE9FC] to-[#F3EFFC] overflow-hidden w-full">
              
              {/* Soft Lavender Background Glow Blobs */}
              <div className="absolute top-[5%] left-[-200px] w-[600px] h-[600px] bg-[#DCD4F9]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <div className="absolute top-[35%] right-[-200px] w-[700px] h-[700px] bg-[#E5DFFF]/40 blur-[140px] rounded-full pointer-events-none z-0" />
              <div className="absolute bottom-[20%] left-[10%] w-[600px] h-[600px] bg-[#E2DBFC]/35 blur-[130px] rounded-full pointer-events-none z-0" />
              <div className="absolute bottom-[2%] right-[-100px] w-[500px] h-[500px] bg-[#E8E2FF]/30 blur-[110px] rounded-full pointer-events-none z-0" />

              {/* 3. Info Section ("Meet SplitEase.") */}
              <section className="px-6 py-24 w-full relative z-10 bg-transparent">
                <div className="max-w-[88rem] mx-auto">
                  {/* Row 1: Meet details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-start">
                    <div className="flex flex-col items-start">
                      <h2 
                        className="text-black text-4xl md:text-5xl font-semibold leading-tight mb-8 select-none"
                        style={{ letterSpacing: '-0.03em' }}
                      >
                        Meet SplitEase.
                      </h2>
                      <button 
                        onClick={() => navigateTo('features')}
                        className="inline-flex items-center gap-3 bg-black text-white text-base font-semibold pl-8 pr-2 py-2 rounded-full hover:bg-gray-800 transition-colors duration-200 cursor-pointer shadow-md"
                      >
                        <span>Explore Features</span>
                        <span className="bg-white rounded-full p-2 flex items-center justify-center">
                          <ArrowRight className="w-5 h-5 text-black" />
                        </span>
                      </button>
                    </div>

                    <div>
                      <p className="text-black/70 text-2xl md:text-3xl leading-relaxed font-normal">
                        SplitEase helps groups organize expenses, calculate who owes whom, track balances in real time, and settle payments without confusion.
                      </p>
                    </div>
                  </div>

                  {/* Row 2: 4-Column Card Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Card 1 (spans 2 cols on lg) */}
                    <div 
                      className="rounded-2xl lg:col-span-2 overflow-hidden shadow-sm flex flex-col justify-between p-7 min-h-80 relative select-none"
                      style={{
                        backgroundImage: "url('https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260423_164207_f243351d-ed59-48ec-83a0-a5e996bdbe3c.png&w=1280&q=85')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      <h3 
                        className="text-black text-2xl font-semibold leading-snug"
                        style={{ letterSpacing: '-0.02em' }}
                      >
                        Shared Expenses Simplified
                      </h3>
                      <p className="text-black/70 text-base max-w-xs leading-relaxed font-normal">
                        Record bills, rent, food, travel costs, and other shared expenses in seconds.
                      </p>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-[#2B2644] rounded-2xl p-7 min-h-80 flex flex-col justify-between shadow-sm select-none">
                      <h3 className="text-white text-2xl font-semibold leading-snug">
                        Multiple<br />Split Methods
                      </h3>
                      <p className="text-white/60 text-base leading-relaxed font-normal">
                        Split expenses equally, unequally, by percentage, or by custom shares.
                      </p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-[#2B2644] rounded-2xl p-7 min-h-80 flex flex-col justify-between shadow-sm select-none">
                      <h3 className="text-white text-2xl font-semibold leading-snug">
                        Automatic<br />Balance Tracking
                      </h3>
                      <p className="text-white/60 text-base leading-relaxed font-normal">
                        Instantly see who owes money and who should receive payments across every group.
                      </p>
                    </div>

                  </div>
                </div>
              </section>

              {/* 4. Backed By Section */}
              <section className="px-6 py-16 w-full border-t border-b border-black/[0.05] relative z-10 bg-white/10 backdrop-blur-xs">
                <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
                  {/* Left Title Col (1/4) */}
                  <div className="text-black/70 text-base leading-relaxed font-semibold pr-4 select-none">
                    Built for students, roommates, travelers, teams, and anyone managing shared expenses.
                  </div>

                  {/* Right Marquee Col (3/4) */}
                  <div className="md:col-span-3 relative overflow-hidden w-full [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]">
                    <div className="backers-track select-none py-2">
                      {/* First iteration */}
                      {backerBrands.map((backer, idx) => (
                        <div
                          key={`backer-brand-1-${idx}`}
                          className="mx-10 shrink-0 text-black/50 whitespace-nowrap"
                          style={backer.style}
                        >
                          {backer.name}
                        </div>
                      ))}
                      {/* Second iteration (seamless loop) */}
                      {backerBrands.map((backer, idx) => (
                        <div
                          key={`backer-brand-2-${idx}`}
                          className="mx-10 shrink-0 text-black/50 whitespace-nowrap"
                          style={backer.style}
                        >
                          {backer.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 4.5. Reviews/Testimonials Section */}
              <section className="px-6 py-20 w-full relative z-10 bg-transparent">
                <div className="max-w-[88rem] mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Card 1 */}
                    <div className="bg-white rounded-2xl border border-black/[0.08] p-8 flex flex-col justify-between shadow-sm min-h-[220px]">
                      <p className="text-black text-lg leading-relaxed mb-10 select-none">
                        &ldquo;Fundamental&rdquo; for tracking finances. As good as WhatsApp for containing awkwardness.
                      </p>
                      <div className="flex items-center mt-auto">
                        <div className="w-10 h-10 bg-[#FCD6B8] rounded flex items-center justify-center mr-3 select-none">
                          <span className="font-serif font-black text-lg text-[#3D251E] leading-none">FT</span>
                        </div>
                        <span className="font-serif italic font-bold text-base text-black/85" style={{ fontFamily: 'Georgia, serif' }}>
                          Financial Times
                        </span>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white rounded-2xl border border-black/[0.08] p-8 flex flex-col justify-between shadow-sm min-h-[220px]">
                      <p className="text-black text-lg leading-relaxed mb-10 select-none">
                        Life hack for group trips. Amazing tool to use when traveling with friends! Makes life so easy!!
                      </p>
                      <div className="flex items-center mt-auto">
                        <span className="font-sans italic font-bold text-base text-black/85">
                          Ahah S, iOS
                        </span>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white rounded-2xl border border-black/[0.08] p-8 flex flex-col justify-between shadow-sm min-h-[220px]">
                      <p className="text-black text-lg leading-relaxed mb-10 select-none">
                        Makes it easy to split everything from your dinner bill to rent.
                      </p>
                      <div className="flex items-center mt-auto">
                        <div className="w-10 h-10 bg-[#F0F0F0] border border-black/[0.1] rounded flex items-center justify-center mr-3 select-none">
                          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center border border-black/[0.05]">
                            <span className="font-serif font-bold text-base text-black leading-none" style={{ fontFamily: 'Georgia, serif' }}>T</span>
                          </div>
                        </div>
                        <span className="font-serif italic font-bold text-base text-black/85" style={{ fontFamily: 'Georgia, serif' }}>
                          NY Times
                        </span>
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div className="bg-white rounded-2xl border border-black/[0.08] p-8 flex flex-col justify-between shadow-sm min-h-[220px]">
                      <p className="text-black text-lg leading-relaxed mb-10 select-none">
                        So amazing to have this app manage balances and help keep money out of relationships. love it!
                      </p>
                      <div className="flex items-center mt-auto">
                        <span className="font-sans italic font-bold text-base text-black/85">
                          Haseena C, Android
                        </span>
                      </div>
                    </div>

                    {/* Card 5 */}
                    <div className="bg-white rounded-2xl border border-black/[0.08] p-8 flex flex-col justify-between shadow-sm min-h-[220px]">
                      <p className="text-black text-lg leading-relaxed mb-10 select-none">
                        I never fight with roommates over bills because of this genius expense-splitting app
                      </p>
                      <div className="flex items-center mt-auto">
                        <div className="w-10 h-10 bg-[#005B7F] rounded flex flex-col items-center justify-center p-1 mr-3 select-none">
                          <span className="text-[5px] text-white font-extrabold leading-tight text-center uppercase tracking-tighter" style={{ fontSize: '5px' }}>
                            BUSINESS<br />INSIDER
                          </span>
                        </div>
                        <span className="font-sans italic font-bold text-base text-black/85">
                          Business Insider
                        </span>
                      </div>
                    </div>

                    {/* Card 6 */}
                    <div className="bg-white rounded-2xl border border-black/[0.08] p-8 flex flex-col justify-between shadow-sm min-h-[220px]">
                      <p className="text-black text-lg leading-relaxed mb-10 select-none">
                        I use it everyday. I use it for trips, roommates, loans. I love SplitEase.
                      </p>
                      <div className="flex items-center mt-auto">
                        <span className="font-sans italic font-bold text-base text-black/85">
                          Trickseyus, iOS
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              </section>

              {/* 4.75. User Growth Statistics & Animated Graph Section */}
              <section className="px-6 py-20 w-full relative z-10 bg-transparent">
                <div className="max-w-[88rem] mx-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                    
                    {/* Left Column: Growth Statistics Card */}
                    <div className="lg:col-span-4 bg-[#2B2644] rounded-3xl p-8 text-white flex flex-col justify-between shadow-lg relative overflow-hidden select-none">
                      {/* Soft ambient violet glow */}
                      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-purple-500/20 blur-[60px] rounded-full pointer-events-none" />
                      
                      <div className="relative z-10">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-purple-200 mb-6">
                          <Sparkles className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
                          <span>SplitEase Growth</span>
                        </div>
                        
                        <h3 className="text-3xl font-extrabold tracking-tight mb-2 transition-all duration-300">
                          {activeYear.milestone}
                        </h3>
                        <p className="text-purple-200/70 text-sm leading-relaxed mb-8 min-h-[60px] transition-all duration-300">
                          {activeYear.desc}
                        </p>
                      </div>

                      {/* Animated Stat Numbers */}
                      <div className="relative z-10 grid grid-cols-1 gap-6 pt-6 border-t border-white/10">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-purple-200/50 block mb-1">Active Users</span>
                          <span className="text-4xl font-extrabold tracking-tight font-sans text-white">
                            {formatUsersVal(animatedUsers)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-200/50 block mb-1">Settled Volume</span>
                            <span className="text-2xl font-extrabold tracking-tight font-sans text-white">
                              {formatSettledVal(animatedSettled)}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-200/50 block mb-1">Active Groups</span>
                            <span className="text-2xl font-extrabold tracking-tight font-sans text-white">
                              {formatGroupsVal(animatedGroups)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Interactive Graph Card */}
                    <div className="lg:col-span-8 bg-white rounded-3xl p-8 border border-black/[0.08] shadow-sm flex flex-col justify-between overflow-hidden relative select-none min-h-[440px]">
                      <div>
                        <h3 className="text-black text-2xl font-bold tracking-tight mb-1.5">
                          Millions Tracking Together
                        </h3>
                        <p className="text-gray-500 text-sm max-w-xl">
                          Hover over each year to view key milestones and observe our growth journey from launch to global scale.
                        </p>
                      </div>

                      {/* SVG Graph Drawing Container */}
                      <div className="relative w-full h-[250px] mt-8 flex items-end">
                        {/* SVG Canvas */}
                        <svg 
                          viewBox="0 0 700 250" 
                          className="w-full h-full overflow-visible"
                          style={{ minHeight: '220px' }}
                        >
                          <defs>
                            <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Y-axis helper gridlines */}
                          {[50, 100, 150, 200].map((yVal, idx) => (
                            <line 
                              key={idx}
                              x1="40" 
                              y1={yVal} 
                              x2="660" 
                              y2={yVal} 
                              stroke="#F3F4F6" 
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                          ))}

                          {/* Shaded Area Fill Under Curve */}
                          <motion.path
                            d="M 50 220 C 110 220, 110 206, 170 206 C 230 206, 230 172, 290 172 C 350 172, 350 123, 410 123 C 470 123, 470 80, 530 80 C 590 80, 590 40, 650 40 L 650 230 L 50 230 Z"
                            fill="url(#chart-gradient)"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ delay: 0.6, duration: 1 }}
                          />

                          {/* SVG Curve Line */}
                          <motion.path
                            d="M 50 220 C 110 220, 110 206, 170 206 C 230 206, 230 172, 290 172 C 350 172, 350 123, 410 123 C 470 123, 470 80, 530 80 C 590 80, 590 40, 650 40"
                            fill="none"
                            stroke="#8B5CF6"
                            strokeWidth="4"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                          />

                          {/* Node points */}
                          {[
                            { x: 50, y: 220, idx: 0, yr: 2021 },
                            { x: 170, y: 206, idx: 1, yr: 2022 },
                            { x: 290, y: 172, idx: 2, yr: 2023 },
                            { x: 410, y: 123, idx: 3, yr: 2024 },
                            { x: 530, y: 80, idx: 4, yr: 2025 },
                            { x: 650, y: 40, idx: 5, yr: 2026 }
                          ].map((pt) => {
                            const isHovered = activeYearIndex === pt.idx
                            return (
                              <g key={pt.idx} className="cursor-pointer">
                                {/* Invisible larger hover target */}
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="20"
                                  fill="transparent"
                                  onMouseEnter={() => setActiveYearIndex(pt.idx)}
                                />
                                {/* Glowing background ring */}
                                <motion.circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={isHovered ? 12 : 6}
                                  fill="#8B5CF6"
                                  fillOpacity={isHovered ? 0.2 : 0}
                                  animate={{ scale: isHovered ? [1, 1.3, 1] : 1 }}
                                  transition={{ repeat: Infinity, duration: 2 }}
                                />
                                {/* Main node dot */}
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r={isHovered ? 6 : 4.5}
                                  fill={isHovered ? "#6D28D9" : "#8B5CF6"}
                                  stroke="white"
                                  strokeWidth="2"
                                  onMouseEnter={() => setActiveYearIndex(pt.idx)}
                                  className="transition-colors duration-150"
                                />
                                {/* Year label below */}
                                <text
                                  x={pt.x}
                                  y={pt.y + 24}
                                  textAnchor="middle"
                                  fill={isHovered ? "#000 animate-pulse" : "#9CA3AF"}
                                  fontSize="11"
                                  fontWeight={isHovered ? "bold" : "600"}
                                  onMouseEnter={() => setActiveYearIndex(pt.idx)}
                                >
                                  {pt.yr}
                                </text>
                              </g>
                            )
                          })}
                        </svg>
                      </div>
                    </div>

                  </div>
                </div>
              </section>

              {/* 5. Use Cases Section */}
              <section className="px-6 py-24 w-full relative z-10 bg-transparent">
                <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                  
                  {/* Left Column (Modes Copy Info) */}
                  <div className="md:pr-12 md:pt-2 select-none flex flex-col items-start justify-start">
                    <span className="text-black/60 text-sm font-semibold tracking-wider uppercase mb-2 block">
                      SplitEase in Action
                    </span>
                    <h2 
                      className="text-5xl md:text-6xl font-semibold leading-none mb-6 text-black"
                      style={{ letterSpacing: '-0.04em' }}
                    >
                      Use Cases
                    </h2>
                    <p className="text-black/60 text-base leading-relaxed max-w-sm font-normal mb-8">
                      Designed for groups of every size, helping people manage expenses transparently and settle debts quickly.
                    </p>

                    {/* Split methods card list */}
                    <div className="w-full flex flex-col gap-3">
                      <span className="text-black/60 text-xs font-semibold tracking-wider uppercase mb-1">
                        Flexible Splitting Models
                      </span>
                      {[
                        { title: 'Equal Split', desc: 'Divide any bill evenly among participants with one tap.' },
                        { title: 'Unequal Split', desc: 'Specify exact dollar amounts for unequal shares.' },
                        { title: 'Percentage Split', desc: 'Distribute costs proportionally using percentages.' },
                        { title: 'Share-Based Split', desc: 'Allocate custom shares for complex distributions.' }
                      ].map((method, idx) => (
                        <div 
                          key={idx} 
                          className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-black/[0.05] shadow-xs flex flex-col gap-1 w-full max-w-md hover:bg-white hover:border-black/[0.1] transition-all duration-200"
                        >
                          <span className="text-black font-semibold text-base">
                            {method.title}
                          </span>
                          <span className="text-black/60 text-sm">
                            {method.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column (Branded Video Box Card) */}
                  <div className="relative rounded-3xl overflow-hidden min-h-[720px] shadow-sm select-none">
                    {/* Card Background looping Video */}
                    <video
                      src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_183428_ab5e672a-f608-4dcb-b319-f3e040f02e2d.mp4"
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="object-cover absolute inset-0 w-full h-full z-0 pointer-events-none"
                    />

                    {/* Inside Content Overlay */}
                    <div className="relative z-10 p-10 md:p-12 flex flex-col justify-start h-full min-h-[720px] bg-gradient-to-b from-[#F5F5F5]/30 to-transparent">
                      <h3 
                        className="text-black text-4xl md:text-5xl font-semibold leading-tight mb-5"
                        style={{ letterSpacing: '-0.03em' }}
                      >
                        Travel Groups
                      </h3>
                      <p className="text-black/70 text-base max-w-md mb-8 leading-relaxed font-normal">
                        Track hotel bookings, transport costs, food bills, and shared activities while automatically calculating individual balances and settlements.
                      </p>

                      <div>
                        <a 
                          href="#know-more"
                          onClick={(e) => { e.preventDefault(); setAuthMode('signup'); setShowAuth(true); }}
                          className="inline-flex items-center gap-3 text-black font-semibold group cursor-pointer"
                        >
                          <span className="w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center group-hover:bg-white transition-colors duration-200">
                            <ArrowRight className="w-4 h-4 text-black" />
                          </span>
                          <span className="text-base">Learn More</span>
                        </a>
                      </div>
                    </div>

                  </div>

                </div>
              </section>
            </div>
          </motion.div>
        ) : currentPage === 'features' ? (
          <motion.div
            key="features-page"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full flex flex-col"
          >
            {/* Features Page */}
            <div className="min-h-screen pt-28 pb-16 bg-transparent relative overflow-hidden">
              <div className="absolute top-[10%] left-[-200px] w-[600px] h-[600px] bg-[#DCD4F9]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <div className="absolute bottom-[20%] right-[-200px] w-[600px] h-[600px] bg-[#E5DFFF]/30 blur-[120px] rounded-full pointer-events-none z-0" />

              <div className="max-w-[88rem] mx-auto px-6 relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.05 }}
                  className="text-center max-w-2xl mx-auto mb-16 select-none"
                >
                  <span className="font-quicksand text-purple-300 text-sm tracking-wider uppercase mb-2 block">Powerful Capabilities</span>
                  <h1 className="font-britney-style text-4xl md:text-6xl text-white mb-4">
                    Everything You Need
                  </h1>
                  <p className="font-quicksand text-white/80 text-lg leading-relaxed">
                    SplitEase combines simple expense logging with advanced calculation models, receipt parsing, and automated group debt settlements.
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    { id: 'feature-csv', icon: <FileSpreadsheet className="w-6 h-6 text-purple-600" />, title: "CSV Import", desc: "Import your existing expenses from a CSV file directly into your SplitEase groups without manual data entry." },
                    { id: 'feature-anomaly', icon: <AlertTriangle className="w-6 h-6 text-indigo-600" />, title: "Anomaly Detection", desc: "Our AI monitors your expense patterns and flags unusual or duplicate transactions before they are settled." },
                    { id: 'feature-currency', icon: <Globe className="w-6 h-6 text-emerald-600" />, title: "Multi-Currency Support", desc: "Log transactions in USD, EUR, GBP, or INR during trips. Our system syncs exchange rates automatically." },
                    { id: 'feature-members', icon: <UserPlus className="w-6 h-6 text-orange-600" />, title: "Membership Timelines", desc: "Track when members join or leave groups to accurately validate historical expense splits." },
                    { id: 'import-history', icon: <FileSpreadsheet className="w-6 h-6 text-cyan-600" />, title: "Import History", desc: "View all previous CSV imports and detailed audit reports." },
                    { id: 'feature-traceability', icon: <Activity className="w-6 h-6 text-teal-600" />, title: "Expense Traceability", desc: "Interactive audit trails that show the exact math behind every individual balance calculation." },
                    { id: 'feature-settlement', icon: <CreditCard className="w-6 h-6 text-blue-600" />, title: "Settlement Management", desc: "Record cash payments, bank transfers, or connect external payment methods to clear balances securely." }
                  ].map((feat, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -5, scale: 1.01 }}
                      onClick={() => navigateTo(feat.id)}
                      className="bg-white rounded-3xl p-8 border border-black/[0.05] shadow-xs flex flex-col gap-4 transition-all duration-200 select-none cursor-pointer hover:shadow-xl"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-black/[0.03] shadow-xs">
                        {feat.icon}
                      </div>
                      <h3 className="text-xl font-bold text-black">{feat.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{feat.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : currentPage === 'groups' ? (
          <motion.div
            key="groups-page"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full flex flex-col"
          >
            {/* Groups Page */}
            <div className="min-h-screen pt-28 pb-16 bg-transparent relative overflow-hidden">
              <div className="absolute top-[10%] left-[-200px] w-[600px] h-[600px] bg-[#DCD4F9]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <div className="absolute bottom-[20%] right-[-200px] w-[600px] h-[600px] bg-[#E5DFFF]/30 blur-[120px] rounded-full pointer-events-none z-0" />

              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="max-w-[88rem] mx-auto px-6 relative z-10"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Groups List */}
                  <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-black/[0.06] shadow-sm select-none">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-black">Active Groups</h2>
                      <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        {groups.length} Groups
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {groups.map((group) => {
                        const isActive = activeGroupId === group.id
                        return (
                          <button
                            key={group.id}
                            onClick={() => setActiveGroupId(group.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                              isActive 
                                ? 'bg-purple-50/80 border-purple-200 shadow-xs' 
                                : 'bg-white hover:bg-gray-50 border-gray-100'
                            }`}
                          >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                              isActive ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {group.icon === 'home' ? <HomeIcon className="w-5 h-5" /> : group.icon === 'plane' ? <Plane className="w-5 h-5" /> : <Coffee className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-base font-bold truncate ${isActive ? 'text-purple-900' : 'text-black'}`}>
                                {group.name}
                              </h4>
                              <p className="text-xs text-gray-400 truncate mt-0.5">
                                {group.members.join(', ')}
                              </p>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-transform shrink-0 ${isActive ? 'text-purple-600 translate-x-0.5' : 'text-gray-400'}`} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Right Column: Selected Group Details & Activity */}
                  {(() => {
                    const activeGroup = groups.find(g => g.id === activeGroupId)
                    if (!activeGroup) return null
                    
                    const groupBalances = getBalancesByGroup(activeGroup.id)
                    const groupExpenses = expenses.filter(e => e.groupId === activeGroup.id)
                    
                    return (
                      <div className="lg:col-span-8 flex flex-col gap-6">
                        
                        {/* Group Header Card */}
                        <div className="bg-white rounded-3xl p-8 border border-black/[0.06] shadow-sm select-none">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-100">
                            <div className="flex-1">
                              {isEditingGroup ? (
                                <div className="flex flex-col gap-3 max-w-md">
                                  <input 
                                    type="text" 
                                    value={editGroupForm.name} 
                                    onChange={(e) => setEditGroupForm({...editGroupForm, name: e.target.value})}
                                    className="text-3xl font-extrabold text-black tracking-tight border-b-2 border-purple-500 focus:outline-none bg-transparent w-full"
                                    placeholder="Group Name"
                                  />
                                  <input 
                                    type="text" 
                                    value={editGroupForm.description} 
                                    onChange={(e) => setEditGroupForm({...editGroupForm, description: e.target.value})}
                                    className="text-gray-500 text-sm mt-1 border-b-2 border-purple-500 focus:outline-none bg-transparent w-full"
                                    placeholder="Description"
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button 
                                      onClick={async () => {
                                        try {
                                          const updatedGroup = { ...activeGroup, name: editGroupForm.name, description: editGroupForm.description }
                                          await saveGroup(updatedGroup)
                                          _setGroups(groups.map(g => g.id === activeGroup.id ? updatedGroup : g))
                                          setIsEditingGroup(false)
                                        } catch (err) {
                                          console.error("Failed to update group", err)
                                        }
                                      }}
                                      className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button 
                                      onClick={() => setIsEditingGroup(false)}
                                      className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="group relative pr-8 inline-block cursor-pointer" onClick={() => {
                                  setEditGroupForm({ name: activeGroup.name, description: activeGroup.description || '' })
                                  setIsEditingGroup(true)
                                }}>
                                  <h1 className="text-3xl font-extrabold text-black tracking-tight hover:text-gray-700 transition-colors">{activeGroup.name}</h1>
                                  <p className="text-gray-500 text-sm mt-1">{activeGroup.description}</p>
                                  <button 
                                    className="absolute top-1 right-0 text-gray-300 group-hover:text-purple-600 transition-colors p-1"
                                    title="Edit group details"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => setIsAuditLogOpen(true)}
                                className="bg-white border border-gray-200 text-black hover:bg-gray-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-150 cursor-pointer shadow-sm select-none shrink-0"
                              >
                                Logs
                              </button>
                              <button
                                onClick={() => setIsSettlementLedgerOpen(true)}
                                className="bg-white border border-gray-200 text-black hover:bg-gray-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-150 cursor-pointer shadow-sm select-none shrink-0"
                              >
                                Ledger
                              </button>
                              <button
                                onClick={() => setIsSettlementModalOpen(true)}
                                disabled={groupExpenses.length === 0}
                                className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-100 disabled:text-emerald-400 text-sm font-semibold px-6 py-2.5 rounded-xl transition-all duration-150 cursor-pointer shadow-md select-none shrink-0"
                              >
                                Settle Up
                              </button>
                            </div>
                          </div>

                          {/* Member Balances Widget */}
                          <div className="pt-6">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Member Net Balance</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {groupBalances.map((mb: any, idx: number) => {
                                const isOwed = mb.balance > 0
                                const owes = mb.balance < 0
                                return (
                                  <div key={idx} onClick={() => setSelectedTraceMember(mb.name)} className="bg-gray-50 border border-black/[0.02] rounded-2xl p-4 flex flex-col justify-between shadow-xs cursor-pointer hover:bg-gray-100 transition-colors hover:-translate-y-1 transform">
                                    <span className="text-sm font-bold text-black">{mb.name}</span>
                                    <div className="mt-3">
                                      {isOwed ? (
                                        <div className="flex flex-col">
                                          <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Is Owed</span>
                                          <span className="text-lg font-extrabold text-emerald-600 font-sans">${mb.balance.toFixed(2)}</span>
                                        </div>
                                      ) : owes ? (
                                        <div className="flex flex-col">
                                          <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">Owes</span>
                                          <span className="text-lg font-extrabold text-rose-600 font-sans">${Math.abs(mb.balance).toFixed(2)}</span>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col">
                                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Settled</span>
                                          <span className="text-lg font-extrabold text-gray-400 font-sans">$0.00</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Add Expense Form Inside Group */}
                        <div className="bg-white rounded-3xl p-8 border border-black/[0.06] shadow-sm select-none">
                          <h3 className="text-lg font-bold text-black mb-4">Add Expense in {activeGroup.name}</h3>
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            if (!newExpenseForm.description || !newExpenseForm.amount || !newExpenseForm.paidBy) return;
                            const amt = parseFloat(newExpenseForm.amount);
                            if (isNaN(amt) || amt <= 0) return;
                            
                            const newExpenseId = 'exp-' + Math.random().toString(36).substr(2, 9)
                            const newObj = {
                              id: newExpenseId,
                              groupId: activeGroup.id,
                              description: newExpenseForm.description,
                              amount: amt,
                              paidBy: newExpenseForm.paidBy,
                              splitType: 'equal',
                              date: new Date().toISOString().split('T')[0],
                              category: newExpenseForm.category,
                              currency: newExpenseForm.currency,
                              exchangeRate: parseFloat(newExpenseForm.exchangeRate) || 1.0
                            };
                            saveNewExpense(newObj);
                            setNewExpenseForm({
                              ...newExpenseForm,
                              description: '',
                              amount: '',
                              paidBy: ''
                            });
                          }} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                            <div className="sm:col-span-3 flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Description</label>
                              <input 
                                type="text"
                                placeholder="eg. Dinner check"
                                required
                                value={newExpenseForm.description}
                                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                                className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                              />
                            </div>
                            <div className="sm:col-span-2 flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount</label>
                              <input 
                                type="number"
                                step="any"
                                placeholder="0.00"
                                required
                                value={newExpenseForm.amount}
                                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
                                className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                              />
                            </div>
                            <div className="sm:col-span-1 flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Curr</label>
                              <select 
                                value={newExpenseForm.currency}
                                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, currency: e.target.value })}
                                className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200 cursor-pointer"
                              >
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                              </select>
                            </div>
                            <div className="sm:col-span-3 flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Paid By</label>
                              <select
                                required
                                value={newExpenseForm.paidBy}
                                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, paidBy: e.target.value })}
                                className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200 cursor-pointer"
                              >
                                <option value="">Select Member</option>
                                {activeGroup.members.map((m: string) => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                            </div>
                            <div className="sm:col-span-2 flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</label>
                              <select
                                value={newExpenseForm.category}
                                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, category: e.target.value })}
                                className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200 cursor-pointer"
                              >
                                {['Food', 'Rent', 'Utilities', 'Lodging', 'Transport', 'Other'].map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                            <div className="sm:col-span-1">
                              <button className="w-full bg-black hover:bg-gray-800 text-white rounded-xl p-2.5 flex items-center justify-center shadow-md transition-colors cursor-pointer">
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* Group Expense History */}
                        <div className="bg-white rounded-3xl p-8 border border-black/[0.06] shadow-sm select-none">
                          <h3 className="text-lg font-bold text-black mb-4">Expense History ({groupExpenses.length})</h3>
                          {groupExpenses.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">
                              No expenses logged in this group yet. Use the form above to add one!
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3">
                              {groupExpenses.map((exp) => (
                                <div key={exp.id} className="flex items-center justify-between p-4 bg-gray-50 border border-black/[0.02] rounded-2xl hover:bg-gray-100/70 transition-colors duration-150">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                                      {exp.category === 'Food' ? <Coffee className="w-4.5 h-4.5" /> : exp.category === 'Rent' ? <HomeIcon className="w-4.5 h-4.5" /> : exp.category === 'Transport' ? <Plane className="w-4.5 h-4.5" /> : <DollarSign className="w-4.5 h-4.5" />}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-black text-sm flex items-center gap-2">
                                        {exp.description}
                                        {exp.isAnomaly && (
                                          <span title="Anomaly Detected: Unusually similar to a recent expense">
                                            <AlertTriangle className="w-4 h-4 text-orange-500 inline-block" />
                                          </span>
                                        )}
                                      </h4>
                                      <p className="text-xs text-gray-400 mt-0.5">Paid by {exp.paidBy} on {exp.date}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="font-extrabold text-black font-sans text-base">
                                      {exp.currency === 'EUR' ? '€' : exp.currency === 'GBP' ? '£' : '$'}{exp.amount.toFixed(2)}
                                    </span>
                                    <button 
                                      onClick={() => removeExpense(exp.id)}
                                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all duration-150 cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    )
                  })()}
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : currentPage === 'expenses' ? (
          <motion.div
            key="expenses-page"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full flex flex-col"
          >
            {/* Expenses Page */}
            <div className="min-h-screen pt-28 pb-16 bg-transparent relative overflow-hidden">
              <div className="absolute top-[10%] left-[-200px] w-[600px] h-[600px] bg-[#DCD4F9]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <div className="absolute bottom-[20%] right-[-200px] w-[600px] h-[600px] bg-[#E5DFFF]/30 blur-[120px] rounded-full pointer-events-none z-0" />

              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="max-w-[88rem] mx-auto px-6 relative z-10 select-none"
              >
                
                {/* Search Bar / Action Row */}
                <div className="bg-white rounded-3xl p-6 border border-black/[0.06] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search expenses by description, paid by, or category..."
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                      className="w-full bg-gray-50 border border-transparent rounded-xl pl-11 pr-4 py-2.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (groups.length > 0) {
                        setNewExpenseForm({
                          description: '',
                          amount: '',
                          paidBy: groups[0].members[0],
                          groupId: groups[0].id,
                          category: 'Food',
                          currency: 'USD',
                          exchangeRate: '1.0'
                        });
                        setShowAddExpenseModal(true);
                      }
                    }}
                    className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer self-start md:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record Expense</span>
                  </button>
                </div>

                {/* Main Ledger list */}
                <div className="bg-white rounded-3xl p-8 border border-black/[0.06] shadow-sm">
                  <h2 className="text-2xl font-bold text-black mb-6">All Expenses Ledger</h2>
                  
                  {(() => {
                    const filtered = expenses.filter(exp => {
                      const group = groups.find(g => g.id === exp.groupId)
                      const gName = group ? group.name : ''
                      return exp.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
                             exp.paidBy.toLowerCase().includes(expenseSearch.toLowerCase()) ||
                             exp.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
                             gName.toLowerCase().includes(expenseSearch.toLowerCase())
                    })

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-16 text-gray-400 text-sm">
                          No matching expenses found. Try updating your filters!
                        </div>
                      )
                    }

                    return (
                      <div className="flex flex-col gap-3.5">
                        {filtered.map(exp => {
                          const group = groups.find(g => g.id === exp.groupId)
                          return (
                            <div key={exp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-gray-50 border border-black/[0.02] rounded-2xl hover:bg-gray-100/60 transition-colors duration-150 gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
                                  {exp.category === 'Food' ? <Coffee className="w-5 h-5" /> : exp.category === 'Rent' ? <HomeIcon className="w-5 h-5" /> : exp.category === 'Transport' ? <Plane className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-black text-sm truncate">{exp.description}</h4>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                      {group ? group.name : 'Unknown Group'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      Paid by {exp.paidBy} on {exp.date}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-6">
                                <span className="font-extrabold text-black font-sans text-base">${exp.amount.toFixed(2)}</span>
                                <button 
                                  onClick={() => removeExpense(exp.id)}
                                  className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all duration-150 cursor-pointer"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>

              </motion.div>
            </div>
          </motion.div>
        ) : currentPage === 'balances' ? (
          <motion.div
            key="balances-page"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full flex flex-col"
          >
            {/* Balances Page */}
            <div className="min-h-screen pt-28 pb-16 bg-transparent relative overflow-hidden">
              <div className="absolute top-[10%] left-[-200px] w-[600px] h-[600px] bg-[#DCD4F9]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <div className="absolute bottom-[20%] right-[-200px] w-[600px] h-[600px] bg-[#E5DFFF]/30 blur-[120px] rounded-full pointer-events-none z-0" />

              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="max-w-[88rem] mx-auto px-6 relative z-10 select-none"
              >
                
                <div className="bg-white rounded-3xl p-8 border border-black/[0.06] shadow-sm mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                    <div>
                      <h1 className="text-3xl font-extrabold text-black tracking-tight">Balances Dashboard</h1>
                      <p className="text-gray-500 text-sm mt-1">Summary of net debt and owed positions across all groups.</p>
                    </div>
                    <button
                      onClick={handleSettleUpGlobal}
                      disabled={expenses.length === 0}
                      className="bg-black text-white hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-sm font-semibold px-6 py-2.5 rounded-xl transition-all duration-150 cursor-pointer shadow-md select-none shrink-0"
                    >
                      Settle All Accounts
                    </button>
                  </div>

                  {/* Global Balances Summary List */}
                  <div className="pt-8">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-6">Net Positions ledger</h3>
                    {(() => {
                      const records = getGlobalBalances()
                      if (records.length === 0) {
                        return (
                          <div className="text-center py-16 text-gray-400 text-sm">
                            All balances are completely settled! No outstanding payments.
                          </div>
                        )
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {records.map((rec, idx) => {
                            const isOwed = rec.balance > 0
                            return (
                              <div key={idx} className="bg-gray-50 border border-black/[0.02] rounded-2xl p-5 flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    isOwed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                  }`}>
                                    {isOwed ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-black text-sm">{rec.name}</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">In group: {rec.groupName}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`text-[10px] uppercase font-bold tracking-wider block ${isOwed ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {isOwed ? 'Is Owed' : 'Owes'}
                                  </span>
                                  <span className={`text-lg font-extrabold font-sans ${isOwed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    ${Math.abs(rec.balance).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>

              </motion.div>
            </div>
          </motion.div>
        ) : currentPage === 'support' ? (
          <motion.div
            key="support-page"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full flex flex-col"
          >
            {/* Support Page */}
            <div className="min-h-screen pt-28 pb-16 bg-transparent relative overflow-hidden">
              <div className="absolute top-[10%] left-[-200px] w-[600px] h-[600px] bg-[#DCD4F9]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <div className="absolute bottom-[20%] right-[-200px] w-[600px] h-[600px] bg-[#E5DFFF]/30 blur-[120px] rounded-full pointer-events-none z-0" />

              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="max-w-[88rem] mx-auto px-6 relative z-10 select-none"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: FAQs Accordion */}
                  <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-black/[0.06] shadow-sm">
                    <h2 className="text-2xl font-bold text-black mb-6">Frequently Asked Questions</h2>
                    <div className="flex flex-col gap-4">
                      {[
                        { q: "How does SplitEase calculate debt simplification?", a: "SplitEase runs a network minimization flow. It pools all group debts together and matches major debtors directly with major creditors, bypassing round-robin exchanges and minimizing transaction counts." },
                        { q: "Can I use SplitEase offline?", a: "Yes, absolutely! All logs and ledger updates are queued locally in browser storage. Once an active internet connection is detected, the app automatically syncs the data." },
                        { q: "What premium perks does SplitEase Pro offer?", a: "SplitEase Pro unlocks OCR receipt scanning, historical charts exports, multiple currency configurations, and prioritizes card support queues." },
                        { q: "Is my personal payment information secure?", a: "Security is our top priority. SplitEase does not store passwords or direct payment credentials. We connect securely through Plaid endpoints using bank-level 256-bit encryption." }
                      ].map((faq, idx) => {
                        const isOpen = expandedFaqIndex === idx
                        return (
                          <div key={idx} className="border-b border-gray-100 pb-4">
                            <button
                              onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                              className="w-full flex items-center justify-between text-left font-bold text-black hover:text-purple-600 transition-colors py-2 cursor-pointer"
                            >
                              <span className="text-base">{faq.q}</span>
                              <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90 text-purple-600' : 'text-gray-400'}`} />
                            </button>
                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <p className="text-gray-500 text-sm leading-relaxed mt-2 pt-2 border-t border-gray-50/50">
                                    {faq.a}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Right Column: Contact Support Form */}
                  <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-black/[0.06] shadow-sm">
                    {supportSubmitted ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center text-center py-8"
                      >
                        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 shadow-xs animate-bounce">
                          <Check className="w-7 h-7" strokeWidth={3} />
                        </div>
                        <h3 className="text-xl font-bold text-black mb-2">Message Sent!</h3>
                        <p className="text-gray-500 text-sm max-w-xs">
                          Thank you for reaching out. A SplitEase helper will reply to you within 24 hours.
                        </p>
                        <button
                          onClick={() => {
                            setSupportSubmitted(false);
                            setSupportMessage({ name: '', email: '', subject: 'General', message: '' });
                          }}
                          className="mt-6 border border-gray-250 text-black text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer bg-white"
                        >
                          Send Another Message
                        </button>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col">
                        <h2 className="text-2xl font-bold text-black mb-1.5">Contact Support</h2>
                        <p className="text-gray-500 text-sm mb-6">Have a question or feedback? Drop us a message.</p>

                        <form onSubmit={(e) => { e.preventDefault(); setSupportSubmitted(true); }} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Your Name</label>
                            <input 
                              type="text"
                              placeholder="eg. Jane Doe"
                              required
                              value={supportMessage.name}
                              onChange={(e) => setSupportMessage({ ...supportMessage, name: e.target.value })}
                              className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email Address</label>
                            <input 
                              type="email"
                              placeholder="eg. jane@example.com"
                              required
                              value={supportMessage.email}
                              onChange={(e) => setSupportMessage({ ...supportMessage, email: e.target.value })}
                              className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Subject</label>
                            <select
                              value={supportMessage.subject}
                              onChange={(e) => setSupportMessage({ ...supportMessage, subject: e.target.value })}
                              className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200 cursor-pointer"
                            >
                              <option value="General">General Inquiry</option>
                              <option value="Payments">Payments & Settlement</option>
                              <option value="Security">Security & Privacy</option>
                              <option value="Feedback">Feature Feedback</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Message</label>
                            <textarea 
                              rows={4}
                              placeholder="Write your message here..."
                              required
                              value={supportMessage.message}
                              onChange={(e) => setSupportMessage({ ...supportMessage, message: e.target.value })}
                              className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200 resize-none"
                            />
                          </div>

                          <button className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer mt-2">
                            <Send className="w-4 h-4 text-white" />
                            <span>Send Message</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

        ) : currentPage === 'about' ? (
          <motion.div key="about-page" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.25 }} className="w-full flex flex-col">
            <div className="min-h-screen pt-28 pb-16 bg-transparent relative overflow-hidden">
              <div className="absolute top-[10%] left-[-200px] w-[600px] h-[600px] bg-[#DCD4F9]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <div className="absolute bottom-[20%] right-[-200px] w-[600px] h-[600px] bg-[#E5DFFF]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="max-w-[88rem] mx-auto px-6 relative z-10"
              >
                {/* Hero */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-center max-w-3xl mx-auto mb-20 select-none"
                >
                  <span className="font-quicksand text-purple-300 text-sm tracking-wider uppercase mb-3 block">Our Story</span>
                  <h1 className="font-britney-style text-5xl md:text-7xl text-white mb-6" style={{ letterSpacing: '-0.02em' }}>Built for the way<br />people actually live</h1>
                  <p className="font-quicksand text-white/80 text-xl leading-relaxed">SplitEase was founded in 2021 by a group of college roommates tired of the awkwardness of splitting expenses. Today, we help millions of people manage shared finances effortlessly.</p>
                </motion.div>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
                  {[
                    { num: '12.4M', label: 'Active Users' },
                    { num: '$1.8B', label: 'Settled Volume' },
                    { num: '4.2M', label: 'Active Groups' },
                    { num: '50+', label: 'Currencies Supported' }
                  ].map((stat, i) => (
                    <motion.div key={i} whileHover={{ y: -4 }} className="bg-white rounded-3xl p-8 border border-black/[0.05] shadow-xs text-center select-none">
                      <div className="text-4xl font-extrabold text-black tracking-tight mb-1">{stat.num}</div>
                      <div className="text-sm text-gray-500 font-semibold">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
                {/* Mission */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 items-center">
                  <div className="select-none">
                    <span className="text-purple-300 text-sm font-bold tracking-wider uppercase mb-3 block">Mission</span>
                    <h2 className="text-4xl font-extrabold tracking-tight text-white mb-6" style={{ letterSpacing: '-0.03em' }}>Eliminate financial awkwardness, forever</h2>
                    <p className="text-white/80 leading-relaxed text-base mb-4">Money is one of the leading causes of stress in relationships. We built SplitEase to remove that friction — so people can focus on experiences, not the math.</p>
                    <p className="text-white/80 leading-relaxed text-base">Whether splitting rent with roommates, tracking a group vacation, or managing team lunches, SplitEase makes it seamless.</p>
                  </div>
                  <div className="bg-[#2B2644] rounded-3xl p-10 text-white select-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-purple-500/20 blur-[60px] rounded-full pointer-events-none" />
                    <div className="relative z-10">
                      <div className="text-purple-300 text-sm font-bold tracking-wider uppercase mb-5">Our Values</div>
                      {[
                        { title: 'Transparency', desc: 'Every calculation is shown. No hidden math.' },
                        { title: 'Simplicity', desc: 'Complex finances, made elegantly simple.' },
                        { title: 'Trust', desc: 'Bank-grade security for every transaction.' },
                        { title: 'Fairness', desc: 'Multiple split models for every situation.' }
                      ].map((v, i) => (
                        <div key={i} className="flex items-start gap-4 mb-5 last:mb-0">
                          <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 shrink-0" />
                          <div>
                            <div className="font-bold text-white text-base">{v.title}</div>
                            <div className="text-purple-200/70 text-sm mt-0.5">{v.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Team */}
                <div className="mb-20 select-none">
                  <div className="text-center mb-12">
                    <span className="text-purple-300 text-sm font-bold tracking-wider uppercase mb-3 block">Leadership</span>
                    <h2 className="text-4xl font-extrabold tracking-tight text-white" style={{ letterSpacing: '-0.03em' }}>Meet the team</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { name: 'Aria Chen', role: 'Co-Founder & CEO', avatar: 'bg-purple-500', initials: 'AC' },
                      { name: 'Marcus Reid', role: 'Co-Founder & CTO', avatar: 'bg-indigo-500', initials: 'MR' },
                      { name: 'Sofia Patel', role: 'Head of Design', avatar: 'bg-emerald-500', initials: 'SP' },
                      { name: 'James Okafor', role: 'Head of Growth', avatar: 'bg-amber-500', initials: 'JO' }
                    ].map((member, i) => (
                      <motion.div key={i} whileHover={{ y: -4 }} className="bg-white rounded-3xl p-7 border border-black/[0.05] shadow-xs flex flex-col items-center text-center gap-4 select-none">
                        <div className={`w-14 h-14 rounded-2xl ${member.avatar} flex items-center justify-center text-white font-bold text-lg shadow-md`}>{member.initials}</div>
                        <div>
                          <div className="font-bold text-black text-base">{member.name}</div>
                          <div className="text-gray-500 text-sm mt-0.5">{member.role}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                {/* Jobs CTA */}
                <div className="bg-[#2B2644] rounded-3xl p-10 text-center text-white select-none relative overflow-hidden">
                  <div className="absolute inset-0 bg-purple-500/10 blur-[60px] pointer-events-none" />
                  <div className="relative z-10">
                    <h3 className="text-3xl font-extrabold tracking-tight mb-3">We're hiring</h3>
                    <p className="text-purple-200/70 max-w-md mx-auto mb-6 text-base">Join our team of engineers, designers, and problem-solvers building the future of shared finance.</p>
                    <button onClick={() => { setAuthMode('signup'); setShowAuth(true); }} className="bg-white text-black font-bold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors cursor-pointer shadow-md">View Open Roles</button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

        ) : currentPage === 'blog' ? (
          <motion.div key="blog-page" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.25 }} className="w-full flex flex-col">
            <div className="min-h-screen pt-28 pb-16 bg-transparent relative overflow-hidden">
              <div className="absolute top-[10%] left-[-200px] w-[600px] h-[600px] bg-[#DCD4F9]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <div className="absolute bottom-[20%] right-[-200px] w-[600px] h-[600px] bg-[#E5DFFF]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="max-w-[88rem] mx-auto px-6 relative z-10"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-center max-w-2xl mx-auto mb-16 select-none"
                >
                  <span className="font-quicksand text-purple-300 text-sm tracking-wider uppercase mb-3 block">SplitEase Blog</span>
                  <h1 className="font-britney-style text-5xl md:text-7xl text-white mb-4" style={{ letterSpacing: '-0.02em' }}>Tips, Updates & Stories</h1>
                  <p className="font-quicksand text-white/80 text-lg">Guides on managing shared finances, product updates, and stories from our community.</p>
                </motion.div>
                {/* Featured */}
                <div className="bg-[#2B2644] rounded-3xl p-10 md:p-12 mb-10 text-white relative overflow-hidden select-none">
                  <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-500/20 blur-[80px] rounded-full pointer-events-none" />
                  <div className="relative z-10 max-w-2xl">
                    <span className="bg-purple-500/25 text-purple-200 text-xs font-bold px-3 py-1 rounded-full border border-purple-400/20 mb-5 inline-block">Featured</span>
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4" style={{ letterSpacing: '-0.03em' }}>How we helped 12 million people stop arguing about money</h2>
                    <p className="text-purple-200/70 text-base leading-relaxed mb-6">A deep dive into the psychology of shared expenses and how transparent financial tools can strengthen — not strain — relationships.</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center text-white font-bold text-xs">AC</div>
                      <div>
                        <div className="text-sm font-semibold">Aria Chen</div>
                        <div className="text-xs text-purple-300/60">June 10, 2026 · 8 min read</div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Articles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { tag: 'Tips', tagColor: 'bg-emerald-500', title: '5 ways to split travel expenses without ruining friendships', date: 'June 8, 2026', read: '5 min', author: 'MR' },
                    { tag: 'Product', tagColor: 'bg-purple-500', title: 'Introducing SplitEase Pay Card: split at the moment of purchase', date: 'June 5, 2026', read: '4 min', author: 'SP' },
                    { tag: 'Guide', tagColor: 'bg-indigo-500', title: 'How to use SplitEase for monthly roommate expense tracking', date: 'May 28, 2026', read: '6 min', author: 'JO' },
                    { tag: 'Tips', tagColor: 'bg-amber-500', title: 'The complete guide to debt minimization in group expenses', date: 'May 20, 2026', read: '7 min', author: 'AC' },
                    { tag: 'Product', tagColor: 'bg-rose-500', title: "OCR Receipt Scanning: how it works and why it\u2019s accurate", date: 'May 15, 2026', read: '3 min', author: 'MR' },
                    { tag: 'Community', tagColor: 'bg-teal-500', title: 'Real stories: how SplitEase kept a 6-person trip stress-free', date: 'May 8, 2026', read: '5 min', author: 'SP' }
                  ].map((article, i) => (
                    <motion.div key={i} whileHover={{ y: -5 }} className="bg-white rounded-3xl p-7 border border-black/[0.05] shadow-xs flex flex-col gap-4 cursor-pointer select-none">
                      <span className={`${article.tagColor} text-white text-[10px] font-bold px-2.5 py-1 rounded-full self-start`}>{article.tag}</span>
                      <h3 className="font-extrabold text-black text-lg leading-snug flex-1">{article.title}</h3>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">{article.author}</div>
                        </div>
                        <span className="text-xs text-gray-400">{article.date} · {article.read}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>

        ) : currentPage === 'pricing' ? (
          <motion.div key="pricing-page" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.25 }} className="w-full flex flex-col">
            <div className="min-h-screen pt-28 pb-16 bg-transparent relative overflow-hidden">
              <div className="absolute top-[10%] left-[-200px] w-[600px] h-[600px] bg-[#DCD4F9]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <div className="absolute bottom-[20%] right-[-200px] w-[600px] h-[600px] bg-[#E5DFFF]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="max-w-[88rem] mx-auto px-6 relative z-10"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-center max-w-2xl mx-auto mb-16 select-none"
                >
                  <span className="font-quicksand text-purple-300 text-sm tracking-wider uppercase mb-3 block">Pricing</span>
                  <h1 className="font-britney-style text-5xl md:text-7xl text-white mb-4" style={{ letterSpacing: '-0.02em' }}>Simple, transparent pricing</h1>
                  <p className="font-quicksand text-white/80 text-lg">Start free. Upgrade when you're ready for more.</p>
                </motion.div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 items-start">
                  {[
                    { name: 'Free', price: '$0', period: 'forever', desc: 'Perfect for small groups and occasional expense splits.', features: ['Up to 3 active groups', 'Equal split only', 'Basic balance tracking', 'Mobile & web access', 'Email support'], cta: 'Get Started Free', highlight: false },
                    { name: 'SplitEase Pro', price: '$9.99', period: 'per month', desc: 'For power users who split expenses regularly across multiple groups.', features: ['Unlimited groups', 'All split methods', 'OCR receipt scanning', 'Multi-currency support', 'Export to CSV/PDF', 'Priority support'], cta: 'Start Pro Trial', highlight: true },
                    { name: 'Business', price: '$24.99', period: 'per month', desc: 'For teams and organizations managing shared budgets at scale.', features: ['Everything in Pro', 'Team admin controls', 'SplitEase Pay Card', 'Advanced analytics', 'API access', 'Dedicated account manager'], cta: 'Contact Sales', highlight: false }
                  ].map((plan, i) => (
                    <motion.div key={i} whileHover={{ y: -6 }} className={`rounded-3xl p-8 flex flex-col border shadow-sm select-none ${plan.highlight ? 'bg-[#2B2644] text-white border-transparent shadow-2xl' : 'bg-white text-black border-black/[0.05]'}`}>
                      {plan.highlight && <span className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full self-start mb-4">Most Popular</span>}
                      <div className="mb-6">
                        <h3 className={`text-xl font-extrabold mb-1 ${plan.highlight ? 'text-white' : 'text-black'}`}>{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className={`text-4xl font-extrabold tracking-tight ${plan.highlight ? 'text-white' : 'text-black'}`}>{plan.price}</span>
                          <span className={`text-sm ${plan.highlight ? 'text-purple-200/60' : 'text-gray-400'}`}>/{plan.period}</span>
                        </div>
                        <p className={`text-sm leading-relaxed ${plan.highlight ? 'text-purple-200/70' : 'text-gray-500'}`}>{plan.desc}</p>
                      </div>
                      <div className="flex flex-col gap-3 mb-8 flex-1">
                        {plan.features.map((feat, fi) => (
                          <div key={fi} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.highlight ? 'bg-purple-500/30' : 'bg-emerald-50'}`}>
                              <Check className={`w-3 h-3 ${plan.highlight ? 'text-purple-200' : 'text-emerald-600'}`} strokeWidth={3} />
                            </div>
                            <span className={`text-sm font-medium ${plan.highlight ? 'text-purple-100' : 'text-gray-700'}`}>{feat}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => { setAuthMode('signup'); setShowAuth(true); }} className={`w-full font-bold py-3.5 rounded-2xl transition-all duration-150 cursor-pointer shadow-md ${plan.highlight ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}>{plan.cta}</button>
                    </motion.div>
                  ))}
                </div>
                <div className="bg-white rounded-3xl p-10 border border-black/[0.05] shadow-xs text-center select-none">
                  <h3 className="text-2xl font-extrabold text-black mb-2">SplitEase Pay Card</h3>
                  <p className="text-gray-500 text-base max-w-lg mx-auto mb-6">Our virtual debit card lets you split expenses at the moment of purchase. Available exclusively with Business plans.</p>
                  <button onClick={() => { setAuthMode('signup'); setShowAuth(true); }} className="bg-black text-white font-bold px-8 py-3 rounded-full hover:bg-gray-800 transition-colors cursor-pointer shadow-md">Learn more about SplitEase Pay</button>
                </div>
              </motion.div>
            </div>
          </motion.div>

        ) : currentPage === 'legal' ? (
          <motion.div key="legal-page" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.25 }} className="w-full flex flex-col">
            <div className="min-h-screen pt-28 pb-16 bg-transparent relative overflow-hidden">
              <div className="absolute top-[10%] left-[-200px] w-[600px] h-[600px] bg-[#DCD4F9]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <div className="absolute bottom-[20%] right-[-200px] w-[600px] h-[600px] bg-[#E5DFFF]/30 blur-[120px] rounded-full pointer-events-none z-0" />
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="max-w-4xl mx-auto px-6 relative z-10"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="mb-12 select-none"
                >
                  <span className="font-quicksand text-purple-300 text-sm tracking-wider uppercase mb-3 block">Legal</span>
                  <h1 className="font-britney-style text-4xl md:text-6xl text-white" style={{ letterSpacing: '-0.02em' }}>Legal Documents</h1>
                  <p className="font-quicksand text-white/80 mt-2">Last updated June 1, 2026. For questions, contact legal@splitease.app</p>
                </motion.div>
                <div className="bg-white rounded-3xl p-10 border border-black/[0.05] shadow-xs mb-6 select-none">
                  <h2 className="text-2xl font-extrabold text-black mb-1">Terms of Service</h2>
                  <p className="text-gray-400 text-sm mb-8">Effective: June 1, 2026</p>
                  <div className="flex flex-col gap-7 text-gray-600 text-sm leading-relaxed">
                    {[{ title: '1. Acceptance of Terms', body: 'By accessing or using SplitEase, you agree to be bound by these Terms of Service and all applicable laws. If you do not agree with any of these terms, you are prohibited from using or accessing this service.' }, { title: '2. Use License', body: 'Permission is granted to use SplitEase for personal, non-commercial purposes only. This license does not permit modification, commercial use, or redistribution of any materials. The license terminates automatically if you violate any of these restrictions.' }, { title: '3. Disclaimer', body: 'The materials on SplitEase are provided on an "as is" basis. SplitEase makes no warranties, expressed or implied, and disclaims all other warranties including merchantability, fitness for a particular purpose, or non-infringement of intellectual property.' }, { title: '4. Limitations', body: 'In no event shall SplitEase or its suppliers be liable for any damages arising out of the use or inability to use the service, even if SplitEase or an authorized representative has been notified of the possibility of such damages.' }].map((section, i) => (
                      <div key={i}>
                        <h4 className="font-bold text-black text-base mb-2">{section.title}</h4>
                        <p>{section.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-10 border border-black/[0.05] shadow-xs mb-6 select-none">
                  <h2 className="text-2xl font-extrabold text-black mb-1">Privacy Policy</h2>
                  <p className="text-gray-400 text-sm mb-8">Effective: June 1, 2026</p>
                  <div className="flex flex-col gap-7 text-gray-600 text-sm leading-relaxed">
                    {[{ title: '1. Information We Collect', body: 'We collect information you provide directly, such as when you create an account, add expenses, or contact support. This includes your name, email address, and financial transaction records within the app.' }, { title: '2. How We Use Your Information', body: 'We use collected information to operate and maintain the service, process transactions, send technical notices, respond to your questions, and improve our products.' }, { title: '3. Data Security', body: 'We use industry-standard AES-256 encryption to protect your personal information. Financial connections are made through Plaid using bank-level security protocols. We never store raw payment credentials.' }, { title: '4. Contact Us', body: 'If you have any questions about this Privacy Policy, please contact us at privacy@splitease.app or write to SplitEase Inc., 340 Pine St, San Francisco, CA 94104.' }].map((section, i) => (
                      <div key={i}>
                        <h4 className="font-bold text-black text-base mb-2">{section.title}</h4>
                        <p>{section.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-10 border border-black/[0.05] shadow-xs select-none">
                  <h2 className="text-2xl font-extrabold text-black mb-1">Coastal Community Bank Privacy Policy</h2>
                  <p className="text-gray-400 text-sm mb-6">Applicable to SplitEase Pay and SplitEase Card users.</p>
                  <p className="text-gray-600 text-sm leading-relaxed">SplitEase partners with Coastal Community Bank (Member FDIC) to provide banking services including SplitEase Pay and SplitEase Card. Your use of these services is subject to Coastal Community Bank's privacy practices in addition to ours. Coastal Community Bank collects and uses your financial data in accordance with applicable federal and state banking laws, including the Gramm-Leach-Bliley Act. For questions specifically related to banking data, contact ccb-privacy@coastalcommunitybankna.com.</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

        ) : currentPage === 'feature-csv' ? (
          <motion.div key="f-csv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FeatureCsvImport 
              onBack={() => setCurrentPage('features')} 
              onViewHistory={() => setCurrentPage('import-history')}
              groups={groups}
              activeGroupId={activeGroupId}
              onSuccess={(route?: any) => { setCurrentPage(route || 'groups'); refreshExpenses(); }}
            />
          </motion.div>
        ) : currentPage === 'feature-anomaly' ? (
          <motion.div key="f-anom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FeatureAnomalyDashboard onBack={() => setCurrentPage('features')} activeGroupId={activeGroupId} />
          </motion.div>
        ) : currentPage === 'feature-currency' ? (
          <motion.div key="f-curr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FeatureMultiCurrency onBack={() => setCurrentPage('features')} />
          </motion.div>
        ) : currentPage === 'feature-members' ? (
          <motion.div key="f-memb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FeatureMemberTimelineDashboard onBack={() => setCurrentPage('features')} activeGroupId={activeGroupId} />
          </motion.div>
        ) : currentPage === 'feature-traceability' ? (
          <motion.div key="f-trac" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FeatureTraceability onBack={() => setCurrentPage('features')} activeGroupId={activeGroupId} onOpenTool={() => setIsAuditLogOpen(true)} />
          </motion.div>
        ) : currentPage === 'feature-settlement' ? (
          <motion.div key="f-setl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FeatureSettlement onBack={() => setCurrentPage('features')} onOpenTool={() => setIsSettlementModalOpen(true)} />
          </motion.div>
        ) : currentPage === 'import-history' ? (
          <motion.div key="f-imph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FeatureImportHistory onBack={() => setCurrentPage('features')} activeGroupId={activeGroupId} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Record Expense Modal overlay */}
      <AnimatePresence>
        {showAddExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddExpenseModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl p-8 border border-black/[0.08] shadow-2xl max-w-md w-full select-none z-10 text-black animate-none"
            >
              <button 
                onClick={() => setShowAddExpenseModal(false)}
                className="absolute right-6 top-6 text-gray-400 hover:text-black transition-colors cursor-pointer bg-transparent border-none"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-2xl font-extrabold text-black tracking-tight mb-1.5">Record Expense</h3>
              <p className="text-gray-500 text-sm mb-6">Log a new bill split across the group members.</p>

              <form onSubmit={handleAddExpense} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select Group</label>
                  <select
                    value={newExpenseForm.groupId}
                    onChange={(e) => {
                      const firstMem = groups.find(g => g.id === e.target.value)?.members[0] || ''
                      setNewExpenseForm({ 
                        ...newExpenseForm, 
                        groupId: e.target.value,
                        paidBy: firstMem
                      })
                    }}
                    className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200 cursor-pointer"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Description</label>
                  <input 
                    type="text"
                    placeholder="eg. Grocery shopping"
                    required
                    value={newExpenseForm.description}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                    className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Amount ($)</label>
                    <input 
                      type="number"
                      step="any"
                      placeholder="0.00"
                      required
                      value={newExpenseForm.amount}
                      onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
                      className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Category</label>
                    <select
                      value={newExpenseForm.category}
                      onChange={(e) => setNewExpenseForm({ ...newExpenseForm, category: e.target.value })}
                      className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200 cursor-pointer"
                    >
                      {['Food', 'Rent', 'Utilities', 'Lodging', 'Transport', 'Other'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Paid By</label>
                  <select
                    required
                    value={newExpenseForm.paidBy}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, paidBy: e.target.value })}
                    className="bg-[#F3F4F6] text-black border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200 cursor-pointer"
                  >
                    {(groups.find((g: any) => g.id === newExpenseForm.groupId)?.members || []).map((m: string) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <button className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer mt-2">
                  <Plus className="w-4 h-4 text-white" />
                  <span>Log Transaction</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* 6. Footer */}
        <footer className="w-full bg-white border-t border-black/[0.06] relative overflow-hidden select-none">
          {/* Top section: links row */}
          <div className="max-w-[88rem] mx-auto px-6 pt-12 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* Left: Brand + tagline */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('home')}>
                <LogoIcon className="w-6 h-6 text-black" />
                <span className="text-xl font-bold tracking-tight text-black">SplitEase</span>
              </div>
              <p className="text-gray-400 text-sm font-medium">Split bills. Keep friendships.</p>
            </div>

            {/* Right: Nav links */}
            <nav className="flex flex-wrap gap-x-8 gap-y-3">
              {[
                { label: 'Features', action: () => navigateTo('features') },
                { label: 'Pricing', action: () => navigateTo('pricing') },
                { label: 'About', action: () => navigateTo('about') },
                { label: 'Blog', action: () => navigateTo('blog') },
                { label: 'Support', action: () => navigateTo('support') },
                { label: 'Terms of Service', action: () => navigateTo('legal') },
                { label: 'Privacy Policy', action: () => navigateTo('legal') },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="text-sm font-semibold text-gray-500 hover:text-black transition-colors duration-150 cursor-pointer bg-transparent border-none p-0"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Giant watermark brand name */}
          <div
            className="relative w-full overflow-hidden"
            style={{
              height: 'clamp(80px, 18vw, 220px)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, white 70%)',
              maskImage: 'linear-gradient(to bottom, transparent 0%, white 70%)',
            }}
          >
            <span
              className="absolute bottom-0 left-1/2 -translate-x-1/2 font-black whitespace-nowrap leading-none pointer-events-none"
              style={{
                fontSize: 'clamp(100px, 22vw, 280px)',
                letterSpacing: '-0.04em',
                userSelect: 'none',
                color: '#DDD5FB',
              }}
            >
              SplitEase
            </span>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-black/[0.05] px-6 py-5">
            <div className="max-w-[88rem] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-gray-400 font-medium">© 2026 SplitEase Inc. All rights reserved.</span>
              <div className="flex items-center gap-6">
                <button onClick={() => navigateTo('legal')} className="text-xs text-gray-400 hover:text-black font-medium transition-colors duration-150 cursor-pointer bg-transparent border-none p-0">Privacy Policy</button>
                <button onClick={() => navigateTo('legal')} className="text-xs text-gray-400 hover:text-black font-medium transition-colors duration-150 cursor-pointer bg-transparent border-none p-0">Terms of Service</button>
              </div>
            </div>
          </div>
        </footer>

        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
          userProfile={userProfile}
          onLogout={async () => {
            try {
              await signOut(auth)
              setCurrentPage('home')
            } catch (err) {
              console.error('Logout error', err)
            }
          }}
        />

        {/* Dynamic Animated Auth Screen Overlay */}
        <AnimatePresence>
          {showAuth && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[#FAFAFA] flex p-3 md:p-6 overflow-hidden select-none text-black"
            >
              {/* Left Pane: Glowing Radial Card */}
              <div 
                className="hidden lg:flex lg:w-[42%] relative rounded-[2rem] overflow-hidden p-12 text-white flex-col justify-between select-none shadow-2xl"
                style={{
                  background: 'radial-gradient(circle at 20% 20%, #A78BFA 0%, #6D28D9 50%, #1E1B4B 100%)'
                }}
              >
                {/* Fine grain noise overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none z-0" />
                
                {/* Soft glowing ambient blobs */}
                <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-[#C084FC]/25 blur-[90px] rounded-full pointer-events-none z-0" />
                <div className="absolute bottom-[25%] right-[10%] w-[250px] h-[250px] bg-[#6366F1]/25 blur-[80px] rounded-full pointer-events-none z-0" />

                {/* Top Logo */}
                <div className="relative z-10 flex items-center gap-2 cursor-pointer" onClick={handleCloseAuth}>
                  <LogoIcon className="w-8 h-8 text-white" />
                  <span className="text-2xl font-bold tracking-tight text-white font-sans">
                    SplitEase
                  </span>
                </div>

                {/* Center Header & Checklist */}
                <div className="relative z-10 my-auto w-full max-w-sm flex flex-col pt-12">
                  <h2 className="text-white text-4xl font-extrabold tracking-tight mb-3 leading-tight select-none">
                    {authMode === 'signup' ? 'Get Started with Us' : authMode === 'forgot' ? 'Reset Password' : 'Welcome Back'}
                  </h2>
                  <p className="text-purple-200/75 text-sm mb-10 leading-relaxed select-none">
                    {authMode === 'signup' 
                      ? 'Complete these easy steps to register your account and start splitting expenses.' 
                      : authMode === 'forgot'
                        ? 'Enter your email address to receive a secure password reset link.'
                        : 'Follow the steps to sign in and access your shared expenses.'}
                  </p>

                  {/* Checklist items */}
                  <div className="flex flex-col gap-4 w-full">
                    {(authMode === 'signup' ? [
                      { stepNum: 1, label: 'Sign up your account' },
                      { stepNum: 2, label: 'Set up your workspace' },
                      { stepNum: 3, label: 'Set up your profile' }
                    ] : authMode === 'forgot' ? [
                      { stepNum: 1, label: 'Enter email address' },
                      { stepNum: 2, label: 'Check your inbox' },
                      { stepNum: 3, label: 'Create new password' }
                    ] : [
                      { stepNum: 1, label: 'Verify credentials' },
                      { stepNum: 2, label: 'Access workspace' },
                      { stepNum: 3, label: 'Complete sign in' }
                    ]).map((stepItem) => {
                      const currentStep = authMode === 'signup' ? signupStep : authMode === 'forgot' ? (forgotSuccess ? 2 : 1) : loginStep;
                      const isActive = currentStep === stepItem.stepNum;
                      const isCompleted = currentStep > stepItem.stepNum;
                      
                      return (
                        <motion.div 
                          key={stepItem.stepNum}
                          layout
                          className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-300 select-none ${
                            isActive 
                              ? 'bg-white text-black border-white shadow-xl scale-[1.02]' 
                              : isCompleted 
                                ? 'bg-white/15 text-white border-white/20 backdrop-blur-md'
                                : 'bg-white/5 text-white/45 border-white/5 backdrop-blur-xs'
                          }`}
                        >
                          {/* Step Circle */}
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                            isActive 
                              ? 'bg-black text-white' 
                              : isCompleted
                                ? 'bg-emerald-500 text-white'
                                : 'bg-white/15 text-white/50'
                          }`}>
                            {isCompleted ? <Check className="w-4 h-4" /> : stepItem.stepNum}
                          </div>
                          <span className="text-sm font-semibold tracking-wide">
                            {stepItem.label}
                          </span>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Bottom Copyright info */}
                <div className="relative z-10 text-white/40 text-xs select-none">
                  &copy; 2026 SplitEase Inc. All rights reserved.
                </div>
              </div>

              {/* Right Pane: White Form Area */}
              <div className="w-full lg:w-[58%] h-full flex flex-col justify-between px-6 md:px-16 py-8 overflow-y-auto bg-white select-none relative">
                {/* Top Row: Back Navigation */}
                <div className="flex items-center justify-between w-full mb-6 shrink-0 z-10">
                  <button 
                    type="button"
                    onClick={handleCloseAuth}
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-black font-semibold text-sm transition-colors duration-150 cursor-pointer bg-transparent border-none p-0"
                  >
                    <ArrowLeft className="w-4 h-4 text-black" />
                    <span>Back to home</span>
                  </button>
                  
                  {/* Logo for mobile only */}
                  <div className="flex lg:hidden items-center gap-2 select-none" onClick={handleCloseAuth}>
                    <LogoIcon className="w-6 h-6 text-black" />
                    <span className="text-lg font-bold tracking-tight text-black font-sans">
                      SplitEase
                    </span>
                  </div>
                </div>

                {/* Centered Form Area */}
                <div className="w-full max-w-[460px] mx-auto my-auto flex flex-col z-10 py-6">
                  <AnimatePresence mode="wait">
                    {authMode === 'signup' ? (
                      // SIGNUP FLOW
                      signupStep === 1 ? (
                        <motion.div
                          key="signup-step-1"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          className="flex flex-col w-full"
                        >
                          <h3 className="text-3xl font-extrabold tracking-tight text-black mb-1.5">
                            Sign Up Account
                          </h3>
                          <p className="text-gray-500 text-sm mb-8">
                            Enter your personal data to create your account.
                          </p>

                        {/* Phone OTP sub-flow */}
                        <AnimatePresence mode="wait">
                          {showPhoneFlow ? (
                            <motion.div key="phone-flow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="flex flex-col gap-4 mb-6">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-base font-bold text-black">{phoneStep === 'input' ? 'Sign up with Phone' : 'Enter OTP'}</h4>
                                <button type="button" onClick={() => { setShowPhoneFlow(false); setPhoneStep('input'); setAuthError(''); }} className="text-xs text-gray-400 hover:text-black cursor-pointer bg-transparent border-none p-0">← Back</button>
                              </div>
                              {phoneStep === 'input' ? (
                                <>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Phone Number</label>
                                    <input
                                      type="tel"
                                      placeholder="+1 234 567 8900"
                                      value={phoneNumber}
                                      onChange={(e) => setPhoneNumber(e.target.value)}
                                      className="w-full bg-[#F3F4F6] border border-transparent rounded-xl px-4 py-3 text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                                    />
                                    <span className="text-xs text-gray-400">Include country code, e.g. +91 9876543210</span>
                                  </div>
                                  {authError && <p className="text-red-500 text-xs font-semibold">{authError}</p>}
                                  <button
                                    type="button"
                                    onClick={handleSendOTP}
                                    disabled={authLoading || !phoneNumber.trim()}
                                    className="w-full bg-black text-white text-base font-semibold py-3 rounded-xl hover:bg-gray-800 transition-all duration-150 cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                                  >
                                    {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Phone className="w-4 h-4" /><span>Send OTP</span></>}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-500">Enter the 6-digit code sent to <span className="font-semibold text-black">{phoneNumber}</span></p>
                                  <div className="flex gap-2 justify-between">
                                    {otpDigits.map((digit, i) => (
                                      <input
                                        key={i}
                                        ref={(el) => { otpRefs.current[i] = el }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                                        onPaste={i === 0 ? handleOtpPaste : undefined}
                                        onKeyDown={(e) => { if (e.key === 'Backspace' && !digit && i > 0) otpRefs.current[i - 1]?.focus() }}
                                        className="w-12 h-14 text-center text-2xl font-bold bg-[#F3F4F6] border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200 text-black"
                                      />
                                    ))}
                                  </div>
                                  {authError && <p className="text-red-500 text-xs font-semibold">{authError}</p>}
                                  <button
                                    type="button"
                                    onClick={handleVerifyOTP}
                                    disabled={authLoading || otpDigits.join('').length !== 6}
                                    className="w-full bg-black text-white text-base font-semibold py-3 rounded-xl hover:bg-gray-800 transition-all duration-150 cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                                  >
                                    {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /><span>Verify OTP</span></>}
                                  </button>
                                  <button type="button" onClick={() => { setPhoneStep('input'); setOtpDigits(['','','','','','']); setAuthError(''); }} className="text-xs text-center text-gray-400 hover:text-black cursor-pointer bg-transparent border-none p-0">Resend code</button>
                                </>
                              )}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>

                        {/* Form Inputs */}
                        {!showPhoneFlow && (
                        <form
                          onSubmit={handleEmailSignup}
                          className="flex flex-col gap-4"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">First Name</label>
                              <input
                                type="text"
                                placeholder="eg. John"
                                required
                                value={signupForm.firstName}
                                onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                                className="w-full bg-[#F3F4F6] border border-transparent rounded-xl px-4 py-3 text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Last Name</label>
                              <input
                                type="text"
                                placeholder="eg. Francisco"
                                required
                                value={signupForm.lastName}
                                onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                                className="w-full bg-[#F3F4F6] border border-transparent rounded-xl px-4 py-3 text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email</label>
                            <input
                              type="email"
                              placeholder="eg. johnfrans@gmail.com"
                              required
                              value={signupForm.email}
                              onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                              className="w-full bg-[#F3F4F6] border border-transparent rounded-xl px-4 py-3 text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5 relative">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Password</label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                required
                                minLength={8}
                                value={signupForm.password}
                                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                                className="w-full bg-[#F3F4F6] border border-transparent rounded-xl pl-4 pr-12 py-3 text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors cursor-pointer"
                              >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                            <span className="text-xs text-gray-400">Must be at least 8 characters.</span>
                          </div>

                          {authError && <p className="text-red-500 text-xs font-semibold">{authError}</p>}

                          <button disabled={authLoading} className="w-full bg-black text-white text-base font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition-all duration-150 cursor-pointer shadow-md select-none mt-4 flex items-center justify-center gap-2 disabled:opacity-60">
                            {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Sign Up</span><ChevronRight className="w-4 h-4 text-white" /></>}
                          </button>
                        </form>
                        )}

                        <div className="mt-8 text-center text-sm text-gray-500 font-medium">
                          Already have an account?{' '}
                          <button 
                            type="button"
                            onClick={() => toggleAuthMode('login')}
                            className="font-bold text-black hover:underline cursor-pointer bg-transparent border-none p-0"
                          >
                            Log in
                          </button>
                        </div>
                      </motion.div>
                    ) : signupStep === 2 ? (
                      <motion.div
                        key="signup-step-2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col w-full"
                      >
                        <h3 className="text-3xl font-extrabold tracking-tight text-black mb-1.5">
                          Set up your workspace
                        </h3>
                        <p className="text-gray-500 text-sm mb-8">
                          Name your first expense group to start splitting bills immediately.
                        </p>

                        <form 
                          onSubmit={(e) => { 
                            e.preventDefault(); 
                            if (signupForm.workspaceName) setSignupStep(3); 
                          }} 
                          className="flex flex-col gap-6"
                        >
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Group / Workspace Name</label>
                            <input 
                              type="text" 
                              placeholder="eg. Summer Trip 2026 or Apartment 4B" 
                              required
                              value={signupForm.workspaceName}
                              onChange={(e) => setSignupForm({ ...signupForm, workspaceName: e.target.value })}
                              className="w-full bg-[#F3F4F6] border border-transparent rounded-xl px-4 py-3 text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Default Currency</label>
                            <select 
                              value={signupForm.currency}
                              onChange={(e) => setSignupForm({ ...signupForm, currency: e.target.value })}
                              className="w-full bg-[#F3F4F6] border border-transparent rounded-xl px-4 py-3 text-black focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200 cursor-pointer"
                            >
                              <option value="USD">USD ($) - US Dollar</option>
                              <option value="EUR">EUR (€) - Euro</option>
                              <option value="GBP">GBP (£) - British Pound</option>
                              <option value="INR">INR (₹) - Indian Rupee</option>
                            </select>
                          </div>

                          <div className="flex gap-4 mt-4">
                            <button 
                              type="button" 
                              onClick={() => setSignupStep(1)}
                              className="w-1/3 border border-gray-200 text-black text-base font-semibold py-3.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 cursor-pointer select-none bg-white"
                            >
                              Back
                            </button>
                            <button className="w-2/3 bg-black text-white text-base font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition-all duration-150 cursor-pointer shadow-md select-none flex items-center justify-center gap-2">
                              <span>Continue</span>
                              <ChevronRight className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="signup-step-3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col w-full"
                      >
                        <h3 className="text-3xl font-extrabold tracking-tight text-black mb-1.5">
                          Set up your profile
                        </h3>
                        <p className="text-gray-500 text-sm mb-8">
                          Choose a color avatar and enter optional contact information.
                        </p>

                        <form 
                          onSubmit={handleCompleteSignup} 
                          className="flex flex-col gap-6"
                        >
                          <div className="flex flex-col gap-2.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select Avatar Color</label>
                            <div className="grid grid-cols-4 gap-3">
                              {[
                                { id: 'purple', bg: 'bg-purple-500', name: 'Purple' },
                                { id: 'indigo', bg: 'bg-indigo-500', name: 'Indigo' },
                                { id: 'emerald', bg: 'bg-emerald-500', name: 'Emerald' },
                                { id: 'amber', bg: 'bg-amber-500', name: 'Amber' },
                              ].map((color) => (
                                <button
                                  key={color.id}
                                  type="button"
                                  onClick={() => setSignupForm({ ...signupForm, avatar: color.id })}
                                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all duration-150 cursor-pointer ${
                                    signupForm.avatar === color.id 
                                      ? 'border-black bg-gray-50 ring-2 ring-black/5' 
                                      : 'border-gray-200 hover:bg-gray-50 bg-white'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-full ${color.bg} shadow-md`} />
                                  <span className="text-[10px] font-bold text-gray-500">{color.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Phone Number (Optional)</label>
                            <input 
                              type="tel" 
                              placeholder="eg. +1 (555) 000-0000" 
                              value={signupForm.phone}
                              onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                              className="w-full bg-[#F3F4F6] border border-transparent rounded-xl px-4 py-3 text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                            />
                          </div>

                          <div className="flex gap-4 mt-4">
                            <button 
                              type="button" 
                              onClick={() => setSignupStep(2)}
                              className="w-1/3 border border-gray-200 text-black text-base font-semibold py-3.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 cursor-pointer select-none bg-white"
                            >
                              Back
                            </button>
                            <button className="w-2/3 bg-black text-white text-base font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition-all duration-150 cursor-pointer shadow-md select-none flex items-center justify-center gap-2">
                              <span>Complete Setup</span>
                              <Check className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )
                  ) : authMode === 'forgot' ? (
                    // FORGOT PASSWORD FLOW
                    <motion.div
                      key="forgot-password-flow"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col w-full"
                    >
                      <h3 className="text-3xl font-extrabold tracking-tight text-black mb-1.5">
                        Reset Password
                      </h3>
                      <p className="text-gray-500 text-sm mb-8">
                        Enter your email address and we'll send you a link to reset your password.
                      </p>

                      {forgotSuccess ? (
                        <div className="bg-emerald-50 text-emerald-800 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center text-center gap-3">
                          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                            <Check className="w-6 h-6" />
                          </div>
                          <h4 className="font-bold text-lg">Check your inbox</h4>
                          <p className="text-sm opacity-90">We've sent a password reset link to <strong>{forgotEmail}</strong>.</p>
                          <button 
                            type="button"
                            onClick={() => setAuthMode('login')}
                            className="mt-4 bg-emerald-600 text-white font-bold py-2 px-6 rounded-xl hover:bg-emerald-700 transition-colors"
                          >
                            Back to Sign In
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email</label>
                            <input
                              type="email"
                              placeholder="eg. johnfrans@gmail.com"
                              required
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              className="w-full bg-[#F3F4F6] border border-transparent rounded-xl px-4 py-3 text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                            />
                          </div>

                          {authError && <p className="text-red-500 text-xs font-semibold">{authError}</p>}

                          <button disabled={authLoading} className="w-full bg-black text-white text-base font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition-all duration-150 cursor-pointer shadow-md select-none mt-4 flex items-center justify-center gap-2 disabled:opacity-60">
                            {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Send Reset Link</span><Send className="w-4 h-4 text-white" /></>}
                          </button>
                        </form>
                      )}

                      <div className="mt-8 text-center text-sm text-gray-500 font-medium">
                        Remember your password?{' '}
                        <button 
                          type="button"
                          onClick={() => { setAuthMode('login'); setAuthError(''); setForgotSuccess(false); }} 
                          className="text-black font-extrabold hover:text-purple-600 transition-colors border-none bg-transparent cursor-pointer p-0"
                        >
                          Sign in instead
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    // LOGIN FLOW
                    loginStep === 1 ? (
                      <motion.div
                        key="login-step-1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col w-full"
                      >
                        <h3 className="text-3xl font-extrabold tracking-tight text-black mb-1.5">
                          Sign In Account
                        </h3>
                        <p className="text-gray-500 text-sm mb-8">
                          Enter your credentials to access your account.
                        </p>

                        {/* Phone OTP sub-flow (Login) */}
                        <AnimatePresence mode="wait">
                          {showPhoneFlow ? (
                            <motion.div key="phone-flow-login" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="flex flex-col gap-4 mb-6">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-base font-bold text-black">{phoneStep === 'input' ? 'Sign in with Phone' : 'Enter OTP'}</h4>
                                <button type="button" onClick={() => { setShowPhoneFlow(false); setPhoneStep('input'); setAuthError(''); }} className="text-xs text-gray-400 hover:text-black cursor-pointer bg-transparent border-none p-0">← Back</button>
                              </div>
                              {phoneStep === 'input' ? (
                                <>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Phone Number</label>
                                    <input
                                      type="tel"
                                      placeholder="+1 234 567 8900"
                                      value={phoneNumber}
                                      onChange={(e) => setPhoneNumber(e.target.value)}
                                      className="w-full bg-[#F3F4F6] border border-transparent rounded-xl px-4 py-3 text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                                    />
                                    <span className="text-xs text-gray-400">Include country code, e.g. +91 9876543210</span>
                                  </div>
                                  {authError && <p className="text-red-500 text-xs font-semibold">{authError}</p>}
                                  <button
                                    type="button"
                                    onClick={handleSendOTP}
                                    disabled={authLoading || !phoneNumber.trim()}
                                    className="w-full bg-black text-white text-base font-semibold py-3 rounded-xl hover:bg-gray-800 transition-all duration-150 cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                                  >
                                    {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Phone className="w-4 h-4" /><span>Send OTP</span></>}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-500">Enter the 6-digit code sent to <span className="font-semibold text-black">{phoneNumber}</span></p>
                                  <div className="flex gap-2 justify-between">
                                    {otpDigits.map((digit, i) => (
                                      <input
                                        key={i}
                                        ref={(el) => { otpRefs.current[i] = el }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                                        onPaste={i === 0 ? handleOtpPaste : undefined}
                                        onKeyDown={(e) => { if (e.key === 'Backspace' && !digit && i > 0) otpRefs.current[i - 1]?.focus() }}
                                        className="w-12 h-14 text-center text-2xl font-bold bg-[#F3F4F6] border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200 text-black"
                                      />
                                    ))}
                                  </div>
                                  {authError && <p className="text-red-500 text-xs font-semibold">{authError}</p>}
                                  <button
                                    type="button"
                                    onClick={handleVerifyOTP}
                                    disabled={authLoading || otpDigits.join('').length !== 6}
                                    className="w-full bg-black text-white text-base font-semibold py-3 rounded-xl hover:bg-gray-800 transition-all duration-150 cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                                  >
                                    {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /><span>Verify OTP</span></>}
                                  </button>
                                  <button type="button" onClick={() => { setPhoneStep('input'); setOtpDigits(['','','','','','']); setAuthError(''); }} className="text-xs text-center text-gray-400 hover:text-black cursor-pointer bg-transparent border-none p-0">Resend code</button>
                                </>
                              )}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>

                        {/* Form Inputs (Login) */}
                        {!showPhoneFlow && (
                        <form
                          onSubmit={handleEmailLogin}
                          className="flex flex-col gap-4"
                        >
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email</label>
                            <input
                              type="email"
                              placeholder="eg. johnfrans@gmail.com"
                              required
                              value={loginForm.email}
                              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                              className="w-full bg-[#F3F4F6] border border-transparent rounded-xl px-4 py-3 text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5 relative">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Password</label>
                              <button type="button" onClick={() => { setAuthMode('forgot'); setAuthError(''); }} className="text-xs font-semibold text-gray-400 hover:text-black transition-colors border-none bg-transparent p-0 cursor-pointer">Forgot password?</button>
                            </div>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                required
                                minLength={8}
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full bg-[#F3F4F6] border border-transparent rounded-xl pl-4 pr-12 py-3 text-black placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-all duration-200"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors cursor-pointer"
                              >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          {authError && <p className="text-red-500 text-xs font-semibold">{authError}</p>}

                          <button disabled={authLoading} className="w-full bg-black text-white text-base font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition-all duration-150 cursor-pointer shadow-md select-none mt-4 flex items-center justify-center gap-2 disabled:opacity-60">
                            {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Sign In</span><ChevronRight className="w-4 h-4 text-white" /></>}
                          </button>
                        </form>
                        )}

                        <div className="mt-8 text-center text-sm text-gray-500 font-medium">
                          Don't have an account?{' '}
                          <button 
                            type="button"
                            onClick={() => { setAuthMode('signup'); setAuthError(''); }} 
                            className="text-black font-extrabold hover:text-purple-600 transition-colors border-none bg-transparent cursor-pointer p-0"
                          >
                            Sign up for free
                          </button>
                        </div>

                      </motion.div>
                    ) : loginStep === 2 ? (
                      <motion.div
                        key="login-step-2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col w-full"
                      >
                        <h3 className="text-3xl font-extrabold tracking-tight text-black mb-1.5">
                          Select workspace
                        </h3>
                        <p className="text-gray-500 text-sm mb-6">
                          Choose a workspace to load your dashboard and balances.
                        </p>

                        <div className="flex flex-col gap-3.5 mb-6">
                          {groups.length > 0 ? (
                            groups.map((ws) => (
                              <button
                                key={ws.id}
                                type="button"
                                onClick={() => {
                                  setLoginForm({ ...loginForm, selectedWorkspace: ws.id });
                                  setActiveGroupId(ws.id);
                                }}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-150 cursor-pointer text-left ${
                                  loginForm.selectedWorkspace === ws.id 
                                    ? 'border-black bg-gray-50 ring-2 ring-black/5' 
                                    : 'border-gray-200 hover:bg-gray-50 bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-2.5 rounded-lg ${loginForm.selectedWorkspace === ws.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    <Users className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-black text-sm">{ws.name}</h4>
                                    <p className="text-xs text-gray-400">{ws.members?.length || 0} active members</p>
                                  </div>
                                </div>
                                <ChevronRight className={`w-4 h-4 transition-transform ${loginForm.selectedWorkspace === ws.id ? 'text-black translate-x-0.5' : 'text-gray-400'}`} />
                              </button>
                            ))
                          ) : (
                            <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
                              <p className="text-sm text-gray-500 mb-2">No workspaces found for your account.</p>
                              <button
                                type="button"
                                onClick={() => toggleAuthMode('signup')}
                                className="text-xs font-bold text-purple-600 hover:underline cursor-pointer"
                              >
                                Create a workspace
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-4 mt-2">
                          <button 
                            type="button" 
                            onClick={() => setLoginStep(1)}
                            className="w-1/3 border border-gray-200 text-black text-base font-semibold py-3.5 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 cursor-pointer select-none bg-white"
                          >
                            Back
                          </button>
                          <button 
                            type="button"
                            onClick={() => { if (loginForm.selectedWorkspace) setLoginStep(3); }}
                            disabled={!loginForm.selectedWorkspace}
                            className="w-2/3 bg-black disabled:bg-gray-200 text-white text-base font-semibold py-3.5 rounded-xl hover:bg-gray-800 disabled:hover:bg-gray-200 transition-all duration-150 cursor-pointer shadow-md select-none flex items-center justify-center gap-2"
                          >
                            <span>Access Workspace</span>
                            <ChevronRight className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="login-step-3"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center text-center py-8 w-full"
                      >
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 shadow-xs animate-bounce">
                          <Check className="w-8 h-8" strokeWidth={3} />
                        </div>
                        <h3 className="text-2xl font-extrabold text-black mb-2">Authenticating...</h3>
                        <p className="text-gray-500 text-sm mb-6 max-w-xs">
                          Setting up your dashboard sessions and sync balances.
                        </p>
                        <Loader2 className="w-6 h-6 text-black animate-spin" />
                      </motion.div>
                    )
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Links */}
              <div className="w-full text-center mt-6 text-xs text-gray-400 flex justify-center gap-6 shrink-0 font-medium z-10">
                <a href="#terms" className="hover:text-black transition-colors duration-150">Terms of Service</a>
                <a href="#privacy" className="hover:text-black transition-colors duration-150">Privacy Policy</a>
                <a href="#support" className="hover:text-black transition-colors duration-150 font-semibold">Support</a>
              </div>
            </div>
            
            {/* Hidden container for Firebase Invisible reCAPTCHA */}
            <div id="recaptcha-container"></div>
          </motion.div>
          )}
        </AnimatePresence>

      </div>
      <CsvImportModal 
        isOpen={isCsvModalOpen} 
        onClose={() => setIsCsvModalOpen(false)} 
        groupId={activeGroupId} 
        onSuccess={() => { refreshExpenses() }} 
      />
      <SettlementModal 
        isOpen={isSettlementModalOpen} 
        onClose={() => setIsSettlementModalOpen(false)} 
        groupId={activeGroupId} 
        onSuccess={(settlement: any) => { if(settlement) setSettlements([...settlements, settlement]); refreshExpenses(); }} 
      />

      {selectedTraceMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative" data-lenis-prevent="true">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">Expense Traceability: {selectedTraceMember}</h3>
              <button onClick={() => setSelectedTraceMember(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                {expenses.map((exp, i) => {
                  const share = exp.amount / (groups.find((g: any) => g.id === activeGroupId)?.members.length || 1);
                  const isPayer = exp.paidBy === selectedTraceMember;
                  const isParticipant = (groups.find((g: any) => g.id === activeGroupId)?.members || []).includes(selectedTraceMember);
                  const amountAffected = isPayer ? exp.amount - share : (isParticipant ? -share : 0);
                  
                  if (Math.abs(amountAffected) < 0.01) return null;
                  
                  return (
                    <div key={i} className="p-4 rounded-xl border border-gray-100 flex justify-between items-center bg-white shadow-sm">
                      <div>
                        <div className="font-bold text-gray-900">{exp.description}</div>
                        <div className="text-xs text-gray-500 mt-1">{exp.date} • Paid by {exp.paidBy}</div>
                        <div className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider">{exp.splitType} Split</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-lg ${amountAffected > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {amountAffected > 0 ? '+' : ''}{amountAffected.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">Net Impact</div>
                      </div>
                    </div>
                  )
                })}
                {settlements.filter(s => s.group_id === activeGroupId && (s.paid_by === selectedTraceMember || s.paid_to === selectedTraceMember)).map((s, i) => {
                   const amountAffected = s.paid_by === selectedTraceMember ? s.amount : -s.amount;
                   return (
                    <div key={`s-${i}`} className="p-4 rounded-xl border border-blue-100 flex justify-between items-center bg-blue-50 shadow-sm">
                      <div>
                        <div className="font-bold text-blue-900">Settlement: {s.method}</div>
                        <div className="text-xs text-blue-700 mt-1">Paid by {s.paid_by} to {s.paid_to}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-lg ${amountAffected > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {amountAffected > 0 ? '+' : ''}{amountAffected.toFixed(2)}
                        </div>
                        <div className="text-xs text-blue-700">Net Impact</div>
                      </div>
                    </div>
                   )
                })}
                {expenses.length === 0 && settlements.length === 0 && (
                  <div className="text-center text-gray-500 py-8">No records found for this member.</div>
                )}
            </div>
          </div>
        </div>
      )}

      {isSettlementLedgerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative" data-lenis-prevent="true">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-600"/> Settlement Ledger</h3>
              <button onClick={() => setIsSettlementLedgerOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              <table className="w-full text-left text-sm">
                  <thead className="bg-white border-b border-gray-100 text-gray-500 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Payer</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Receiver</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Amount</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {settlements.filter(s => s.group_id === activeGroupId).length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-500">No settlements recorded yet.</td></tr>
                    )}
                    {settlements.filter(s => s.group_id === activeGroupId).map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-gray-500">{new Date(s.date).toLocaleDateString()}</td>
                        <td className="px-4 py-4 font-semibold text-gray-900">{s.paid_by}</td>
                        <td className="px-4 py-4 font-semibold text-gray-900">{s.paid_to}</td>
                        <td className="px-4 py-4 font-bold text-emerald-600">${s.amount.toFixed(2)}</td>
                        <td className="px-4 py-4"><span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Completed</span></td>
                      </tr>
                    ))}
                  </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <AuditLogDrawer 
        isOpen={isAuditLogOpen} 
        onClose={() => setIsAuditLogOpen(false)} 
        groupId={activeGroupId} 
      />
    </ReactLenis>
  )
}

export default App

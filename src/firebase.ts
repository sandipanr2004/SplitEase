import { initializeApp, getApp, getApps } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPopup as fbSignInWithPopup,
  signInWithPhoneNumber as fbSignInWithPhoneNumber,
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  signOut as fbSignOut,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
}

// Detect if using placeholder credentials
export const isMockMode = !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('YOUR_API_KEY')

// Initialize Firebase Core only if not in Mock Mode or if initialized dummy config is valid
let app;
if (!isMockMode) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
} else {
  // Dummy initialization so standard sdk calls don't crash immediately on load
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
}

// Setup real services
const realAuth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// --- Mock Auth System ---
type AuthStateCallback = (user: any) => void
const authListeners = new Set<AuthStateCallback>()

export const mockAuth = {
  currentUser: null as any,
  onAuthStateChanged: (callback: AuthStateCallback) => {
    authListeners.add(callback)
    // Initial call
    callback(mockAuth.currentUser)
    return () => {
      authListeners.delete(callback)
    }
  },
  _setCurrentUser: (user: any) => {
    mockAuth.currentUser = user
    if (user) {
      localStorage.setItem('splitease_mock_session', JSON.stringify(user))
    } else {
      localStorage.removeItem('splitease_mock_session')
    }
    authListeners.forEach(cb => cb(user))
  }
}

// Restore active mock session on load
if (isMockMode) {
  try {
    const saved = localStorage.getItem('splitease_mock_session')
    if (saved) {
      mockAuth.currentUser = JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to parse mock session', e)
  }
}

// Export auth based on environment mode
export const auth = isMockMode ? (mockAuth as any) : realAuth

// Helper to create an invisible reCAPTCHA verifier for phone auth
export const createRecaptchaVerifier = (containerId: string) => {
  if (isMockMode) {
    return {
      clear: () => {},
      render: async () => 0,
    } as any
  }
  return new RecaptchaVerifier(realAuth, containerId, { size: 'invisible' })
}

// --- Wrapped Auth Functions ---

export const signInWithPopup = async (authObj: any, provider: any) => {
  if (isMockMode) {
    await new Promise(resolve => setTimeout(resolve, 800))
    const mockUser = {
      uid: 'mock-google-uid',
      email: 'google-user@example.com',
      displayName: 'Google User',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      phoneNumber: null
    }
    mockAuth._setCurrentUser(mockUser)
    return { user: mockUser } as any
  }
  return fbSignInWithPopup(authObj, provider)
}

export const signInWithPhoneNumber = async (authObj: any, phoneNumber: string, verifier: any) => {
  if (isMockMode) {
    await new Promise(resolve => setTimeout(resolve, 800))
    // Return mock confirmation result
    const confirmationResult = {
      verificationId: 'mock-verification-id',
      confirm: async (code: string) => {
        await new Promise(resolve => setTimeout(resolve, 500))
        if (code.length !== 6) {
          const err = new Error('Invalid code')
          ;(err as any).code = 'auth/invalid-verification-code'
          throw err
        }
        const mockUser = {
          uid: 'mock-phone-uid-' + phoneNumber.replace(/\D/g, ''),
          email: null,
          displayName: 'Phone User',
          phoneNumber: phoneNumber,
          photoURL: null
        }
        mockAuth._setCurrentUser(mockUser)
        return { user: mockUser } as any
      }
    }
    return confirmationResult as any
  }
  return fbSignInWithPhoneNumber(authObj, phoneNumber, verifier)
}

export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  if (isMockMode) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const usersStr = localStorage.getItem('splitease_mock_users') || '[]'
    const users = JSON.parse(usersStr)
    const matched = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())
    if (!matched) {
      const err = new Error('User not found')
      ;(err as any).code = 'auth/user-not-found'
      throw err
    }
    if (matched.password !== pass) {
      const err = new Error('Wrong password')
      ;(err as any).code = 'auth/wrong-password'
      throw err
    }
    const mockUser = {
      uid: matched.uid,
      email: matched.email,
      displayName: `${matched.firstName} ${matched.lastName}`,
      photoURL: null,
      phoneNumber: matched.phone || null
    }
    mockAuth._setCurrentUser(mockUser)
    return { user: mockUser } as any
  }
  return fbSignInWithEmailAndPassword(authObj, email, pass)
}

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  if (isMockMode) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const usersStr = localStorage.getItem('splitease_mock_users') || '[]'
    const users = JSON.parse(usersStr)
    const exists = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())
    if (exists) {
      const err = new Error('Email already in use')
      ;(err as any).code = 'auth/email-already-in-use'
      throw err
    }
    const newUid = 'mock-email-uid-' + Math.random().toString(36).substr(2, 9)
    const newUser = {
      uid: newUid,
      email: email,
      password: pass, // Storing password for login simulation
      firstName: '',
      lastName: '',
      avatar: 'purple',
      phone: ''
    }
    users.push(newUser)
    localStorage.setItem('splitease_mock_users', JSON.stringify(users))
    
    const mockUser = {
      uid: newUid,
      email: email,
      displayName: email.split('@')[0],
      photoURL: null,
      phoneNumber: null
    }
    mockAuth._setCurrentUser(mockUser)
    return { user: mockUser } as any
  }
  return fbCreateUserWithEmailAndPassword(authObj, email, pass)
}

export const signOut = async (authObj: any) => {
  if (isMockMode) {
    mockAuth._setCurrentUser(null)
    return
  }
  return fbSignOut(authObj)
}

export const sendPasswordResetEmail = async (authObj: any, email: string) => {
  if (isMockMode) {
    await new Promise(resolve => setTimeout(resolve, 800))
    const usersStr = localStorage.getItem('splitease_mock_users') || '[]'
    const users = JSON.parse(usersStr)
    const exists = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())
    if (!exists) {
      const err = new Error('User not found')
      ;(err as any).code = 'auth/user-not-found'
      throw err
    }
    return
  }
  return fbSendPasswordResetEmail(authObj, email)
}

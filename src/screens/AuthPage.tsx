import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRightCircle,
  Zap,
  LockKeyhole,
  Fingerprint,
  Menu,
  X,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  Loader2,
  ChevronRight,
  Phone,
} from 'lucide-react'
import {
  auth,
  googleProvider,
  createRecaptchaVerifier,
  signInWithPopup,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from '../firebase'
import {
  saveUserProfile,
  saveGroup,
  getGroups,
} from '../db'
import type { ConfirmationResult } from 'firebase/auth'

// ─── Logo SVG ────────────────────────────────────────────────────────────────
const LogoMark: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    fill="none"
    overflow="visible"
    viewBox="0 0 256 256"
    {...props}
  >
    <path
      d="M 64 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 L 128 64 L 128 64.5 L 161 32 L 192 0 L 256 0 L 256 64 L 192 128 L 128 128 L 128 192 L 96 223 L 63.5 256 L 0 256 L 0 192 Z M 256 192 L 224 223 L 191.5 256 L 128 256 L 128 192 L 192 128 L 256 128 Z"
      fill="currentColor"
    />
  </svg>
)

// ─── Fade-up animation variant factory ───────────────────────────────────────
const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
})

// ─── Nav links ────────────────────────────────────────────────────────────────
const NAV_LINKS = ['Vault', 'Plans', 'Install', 'News', 'Help'] as const

// ─── Props ────────────────────────────────────────────────────────────────────
interface AuthPageProps {
  onClose: () => void
  defaultMode?: 'login' | 'signup'
  onAuthSuccess?: () => void
  setActiveGroupId?: (id: string) => void
  setGroups?: (groups: any[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────
const AuthPage: React.FC<AuthPageProps> = ({
  onClose,
  defaultMode = 'signup',
  onAuthSuccess,
  setActiveGroupId,
  setGroups,
}) => {
  // Nav / mobile sheet state
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // Auth state
  const [authMode, setAuthMode] = React.useState<'login' | 'signup'>(defaultMode)
  const [signupStep, setSignupStep] = React.useState(1)
  const [loginStep, setLoginStep] = React.useState(1)
  const [showPassword, setShowPassword] = React.useState(false)
  const [authLoading, setAuthLoading] = React.useState(false)
  const [authError, setAuthError] = React.useState('')

  // Phone OTP
  const [phoneStep, setPhoneStep] = React.useState<'input' | 'otp'>('input')
  const [phoneNumber, setPhoneNumber] = React.useState('')
  const [otpDigits, setOtpDigits] = React.useState(['', '', '', '', '', ''])
  const [showPhoneFlow, setShowPhoneFlow] = React.useState(false)
  const confirmationRef = React.useRef<ConfirmationResult | null>(null)
  const otpRefs = React.useRef<(HTMLInputElement | null)[]>([])

  // Forms
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
  const [loginForm, setLoginForm] = React.useState({ email: '', password: '' })

  // Lock body scroll while this page is mounted
  React.useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  // Auto-close on login success step 3
  React.useEffect(() => {
    if (authMode === 'login' && loginStep === 3) {
      const t = setTimeout(() => { onAuthSuccess?.(); onClose() }, 1500)
      return () => clearTimeout(t)
    }
  }, [loginStep, authMode])

  // ── Error mapping ──────────────────────────────────────────────────────────
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

  // ── Auth handlers ──────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setAuthLoading(true); setAuthError('')
    try {
      const credential = await signInWithPopup(auth, googleProvider)
      if (authMode === 'signup' && credential.user) {
        const displayName = credential.user.displayName || 'Google User'
        const parts = displayName.split(' ')
        await saveUserProfile(credential.user.uid, {
          uid: credential.user.uid,
          firstName: parts[0] || 'Google',
          lastName: parts.slice(1).join(' ') || 'User',
          email: credential.user.email || '',
          phone: '',
          avatar: 'purple',
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
    setAuthLoading(true); setAuthError('')
    try {
      const credential = await createUserWithEmailAndPassword(auth, signupForm.email, signupForm.password)
      if (credential.user) {
        await saveUserProfile(credential.user.uid, {
          uid: credential.user.uid,
          firstName: signupForm.firstName,
          lastName: signupForm.lastName,
          email: signupForm.email,
          phone: '',
          avatar: 'purple',
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
    setAuthLoading(true); setAuthError('')
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password)
      setLoginStep(2)
    } catch (err: any) {
      setAuthError(friendlyError(err.code))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) return
    setAuthLoading(true); setAuthError('')
    try {
      const verifier = createRecaptchaVerifier('recaptcha-container-auth')
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
    setAuthLoading(true); setAuthError('')
    try {
      const credential = await confirmationRef.current?.confirm(code)
      if (authMode === 'signup' && credential?.user) {
        await saveUserProfile(credential.user.uid, {
          uid: credential.user.uid,
          firstName: 'Phone',
          lastName: 'User',
          email: '',
          phone: credential.user.phoneNumber || phoneNumber,
          avatar: 'purple',
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
    setAuthLoading(true); setAuthError('')
    try {
      const activeUser = auth.currentUser
      await saveUserProfile(activeUser.uid, {
        avatar: signupForm.avatar,
        phone: signupForm.phone || activeUser.phoneNumber || '',
      })
      const newGroupId = 'group-' + Math.random().toString(36).substr(2, 9)
      const newGroup = {
        id: newGroupId,
        name: signupForm.workspaceName || 'My First Group',
        members: ['You', 'Alice', 'Bob'],
        icon: 'home',
        description: 'Primary workspace created during signup.',
        ownerUid: activeUser.uid,
        currency: signupForm.currency || 'USD',
      }
      await saveGroup(newGroup)
      const userGroups = await getGroups(activeUser.uid)
      setGroups?.(userGroups)
      setActiveGroupId?.(newGroupId)
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
    const next = [...otpDigits]
    next[index] = digit
    setOtpDigits(next)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  const toggleAuthMode = (mode: 'login' | 'signup') => {
    setAuthMode(mode)
    setSignupStep(1)
    setLoginStep(1)
    setShowPassword(false)
    setAuthError('')
    setShowPhoneFlow(false)
    setPhoneStep('input')
    setPhoneNumber('')
    setOtpDigits(['', '', '', '', '', ''])
  }

  // ── Step progress for left panel ───────────────────────────────────────────
  const currentStep = authMode === 'signup' ? signupStep : loginStep
  const steps = authMode === 'signup'
    ? [
        { stepNum: 1, label: 'Create your account' },
        { stepNum: 2, label: 'Set up your workspace' },
        { stepNum: 3, label: 'Personalize profile' },
      ]
    : [
        { stepNum: 1, label: 'Verify credentials' },
        { stepNum: 2, label: 'Access workspace' },
        { stepNum: 3, label: 'Complete sign in' },
      ]

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 w-full min-h-screen overflow-hidden"
      style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text)' }}
    >
      {/* ── Background video ── */}
      <video
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260518_003132_8b7edcb6-c64d-4a52-a9ca-879942e122ad.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-[#192837]/30 backdrop-blur-[2px]" />

      {/* ── NAVBAR ── */}
      <nav className="absolute top-0 left-0 right-0 z-10">
        <div
          className="mx-auto flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5"
          style={{ maxWidth: 1280 }}
        >
          {/* Logo */}
          <button
            onClick={onClose}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            <LogoMark style={{ fill: '#F2F2EE', width: 28, height: 28 }} />
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: '#F2F2EE', fontFamily: 'var(--font-heading)' }}
            >
              Split Ease
            </span>
          </button>

          {/* Center links — desktop */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href="#"
                className="text-sm font-medium transition-opacity duration-150 hover:opacity-60"
                style={{ color: '#F2F2EE', textDecoration: 'none' }}
              >
                {link}
              </a>
            ))}
          </div>

          {/* Right CTAs — desktop */}
          <div className="hidden md:flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04, filter: 'brightness(1.08)' }}
              whileTap={{ scale: 0.96 }}
              onClick={() => toggleAuthMode('signup')}
              className="cursor-pointer font-semibold text-sm px-5 py-2.5 rounded-full"
              style={{ background: 'var(--color-accent)', color: '#fff', border: 'none' }}
            >
              Start For Free
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => toggleAuthMode('login')}
              className="cursor-pointer font-semibold text-sm px-5 py-2.5 rounded-full"
              style={{ background: 'var(--color-login-bg)', color: 'var(--color-text)', border: 'none' }}
            >
              Sign In
            </motion.button>
          </div>

          {/* Hamburger — mobile */}
          <button
            className="flex md:hidden items-center justify-center p-2 rounded-full cursor-pointer"
            style={{ background: 'rgba(242,242,238,0.18)', color: '#F2F2EE', border: 'none' }}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* ── MOBILE SHEET ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-40"
              style={{
                background: 'rgba(25,40,55,0.35)',
                backdropFilter: 'blur(4px)',
              }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="fixed right-0 top-0 z-50 flex flex-col"
              style={{
                width: 'min(88vw, 360px)',
                height: '100dvh',
                background: '#CFC8C5',
                boxShadow: '-12px 0 48px rgba(25,40,55,0.18)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4">
                <div className="flex items-center gap-2">
                  <LogoMark style={{ fill: '#192837', width: 24, height: 24 }} />
                  <span
                    className="text-lg font-bold"
                    style={{ fontFamily: 'var(--font-heading)', color: '#192837' }}
                  >
                    Split Ease
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-full cursor-pointer"
                  style={{ background: 'rgba(25,40,55,0.08)', border: 'none', color: '#192837' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(25,40,55,0.12)' }} />

              {/* Nav links — staggered */}
              <nav className="flex flex-col gap-1 px-4 pt-5">
                {NAV_LINKS.map((link, i) => (
                  <motion.a
                    key={link}
                    href="#"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="block px-4 py-3 rounded-xl font-medium text-base"
                    style={{ color: '#192837', textDecoration: 'none' }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link}
                  </motion.a>
                ))}
              </nav>

              {/* Bottom CTAs */}
              <div className="mt-auto px-4 pb-8 flex flex-col gap-3">
                <motion.button
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setMobileOpen(false); toggleAuthMode('signup') }}
                  className="w-full cursor-pointer font-semibold text-sm px-5 py-3 rounded-full"
                  style={{ background: 'var(--color-accent)', color: '#fff', border: 'none' }}
                >
                  Start For Free
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.62, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setMobileOpen(false); toggleAuthMode('login') }}
                  className="w-full cursor-pointer font-semibold text-sm px-5 py-3 rounded-full"
                  style={{ background: 'var(--color-login-bg)', color: 'var(--color-text)', border: 'none' }}
                >
                  Sign In
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── HERO + AUTH CARD LAYOUT ── */}
      <div
        className="relative z-10 w-full min-h-screen flex flex-col lg:flex-row items-center"
        style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 'clamp(40px, 8vw, 72px)' }}
      >
        {/* ── LEFT: Hero text ── */}
        <div className="flex-1 flex flex-col justify-center px-5 sm:px-8 pt-20 pb-10 lg:pb-0">
          <div style={{ maxWidth: 560 }}>

            {/* Heading */}
            <motion.h1
              variants={fadeUp(0)}
              initial="hidden"
              animate="visible"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.65rem, 5vw, 3rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.01em',
                color: '#F2F2EE',
                marginBottom: 24,
              }}
            >
              <Zap
                size={24}
                style={{ display: 'inline', verticalAlign: 'middle', position: 'relative', top: -2, color: '#F2F2EE', marginRight: 8 }}
              />
              Split Bills Effortlessly with{' '}
              <LockKeyhole
                size={24}
                style={{ display: 'inline', verticalAlign: 'middle', position: 'relative', top: -2, color: '#F2F2EE', marginRight: 4, marginLeft: 4 }}
              />
              Smart Group Tracking
              <Fingerprint
                size={24}
                style={{ display: 'inline', verticalAlign: 'middle', position: 'relative', top: -2, color: '#F2F2EE', marginLeft: 8 }}
              />
            </motion.h1>

            {/* Subtext */}
            <motion.p
              variants={fadeUp(0.15)}
              initial="hidden"
              animate="visible"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
                lineHeight: 1.65,
                opacity: 0.8,
                color: '#F2F2EE',
                maxWidth: 560,
                marginBottom: 36,
              }}
            >
              Zero stress, total clarity. Split Ease keeps your group finances organized with real-time balance tracking, one-tap settlements, and pro-grade expense tools for your non-stop world.
            </motion.p>

            {/* CTA Button */}
            <motion.button
              variants={fadeUp(0.30)}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.04, filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.96 }}
              onClick={() => toggleAuthMode('signup')}
              className="flex items-center cursor-pointer font-semibold"
              style={{
                background: 'var(--color-accent)',
                color: '#fff',
                borderRadius: 50,
                padding: '17px 24px',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                boxShadow: '0 4px 24px rgba(115,66,226,0.28)',
                minWidth: 210,
                gap: 32,
                justifyContent: 'space-between',
                border: 'none',
              }}
            >
              <span>Get It Free</span>
              <ArrowRightCircle size={20} />
            </motion.button>
          </div>
        </div>

        {/* ── RIGHT: Auth card ── */}
        <div className="w-full lg:w-auto lg:min-w-[460px] xl:min-w-[520px] flex items-center justify-center px-5 sm:px-8 py-10 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="w-full rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(242,242,238,0.92)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              maxWidth: 480,
              border: '1px solid rgba(255,255,255,0.55)',
            }}
          >
            {/* Card top: mode tabs */}
            <div
              className="flex items-center justify-between px-6 pt-6 pb-4"
              style={{ borderBottom: '1px solid rgba(25,40,55,0.08)' }}
            >
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-sm font-medium cursor-pointer transition-opacity hover:opacity-60"
                style={{ background: 'none', border: 'none', color: 'var(--color-text)', padding: 0 }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              {/* Mode toggle pills */}
              <div
                className="flex items-center p-1 rounded-full gap-1"
                style={{ background: 'rgba(25,40,55,0.07)' }}
              >
                {(['signup', 'login'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => toggleAuthMode(mode)}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200"
                    style={{
                      background: authMode === mode ? '#192837' : 'transparent',
                      color: authMode === mode ? '#F2F2EE' : 'var(--color-text)',
                      border: 'none',
                    }}
                  >
                    {mode === 'signup' ? 'Sign Up' : 'Sign In'}
                  </button>
                ))}
              </div>

              {/* Logo */}
              <div className="flex items-center gap-1.5">
                <LogoMark style={{ fill: '#192837', width: 20, height: 20 }} />
                <span
                  className="text-sm font-bold hidden sm:block"
                  style={{ fontFamily: 'var(--font-heading)', color: '#192837' }}
                >
                  Split Ease
                </span>
              </div>
            </div>

            {/* Step progress bar */}
            <div className="flex px-6 pt-4 gap-1.5">
              {steps.map((s) => (
                <div
                  key={s.stepNum}
                  className="flex-1 rounded-full transition-all duration-500"
                  style={{
                    height: 3,
                    background: currentStep >= s.stepNum
                      ? 'var(--color-accent)'
                      : 'rgba(25,40,55,0.12)',
                  }}
                />
              ))}
            </div>

            {/* Form area */}
            <div className="px-6 pb-6 pt-4 overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 220px)' }}>
              <AnimatePresence mode="wait">

                {/* ═══════════ SIGNUP FLOW ═══════════ */}
                {authMode === 'signup' && signupStep === 1 && (
                  <motion.div
                    key="signup-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22 }}
                  >
                    <h3
                      className="text-2xl font-extrabold mb-1"
                      style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
                    >
                      Create Account
                    </h3>
                    <p className="text-sm mb-6" style={{ color: 'rgba(25,40,55,0.55)' }}>
                      Enter your details to get started with Split Ease.
                    </p>

                    <AnimatePresence mode="wait">
                      {showPhoneFlow ? (
                        <PhoneFlow
                          key="phone"
                          phoneStep={phoneStep}
                          phoneNumber={phoneNumber}
                          setPhoneNumber={setPhoneNumber}
                          otpDigits={otpDigits}
                          otpRefs={otpRefs}
                          authLoading={authLoading}
                          authError={authError}
                          handleSendOTP={handleSendOTP}
                          handleVerifyOTP={handleVerifyOTP}
                          handleOtpDigitChange={handleOtpDigitChange}
                          handleOtpPaste={handleOtpPaste}
                          setOtpDigits={setOtpDigits}
                          setPhoneStep={setPhoneStep}
                          setShowPhoneFlow={setShowPhoneFlow}
                          setAuthError={setAuthError}
                        />
                      ) : (
                        <motion.form
                          key="email-signup"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          onSubmit={handleEmailSignup}
                          className="flex flex-col gap-3.5"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <FormField label="First Name">
                              <input
                                type="text"
                                placeholder="John"
                                required
                                value={signupForm.firstName}
                                onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                                className="auth-input"
                              />
                            </FormField>
                            <FormField label="Last Name">
                              <input
                                type="text"
                                placeholder="Doe"
                                value={signupForm.lastName}
                                onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                                className="auth-input"
                              />
                            </FormField>
                          </div>

                          <FormField label="Email">
                            <input
                              type="email"
                              placeholder="john@example.com"
                              required
                              value={signupForm.email}
                              onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                              className="auth-input"
                            />
                          </FormField>

                          <FormField label="Password">
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Min. 8 characters"
                                required
                                minLength={8}
                                value={signupForm.password}
                                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                                className="auth-input pr-11"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                                style={{ background: 'none', border: 'none', color: 'rgba(25,40,55,0.45)', padding: 0 }}
                              >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </FormField>

                          {authError && <ErrorMsg>{authError}</ErrorMsg>}

                          <PrimaryButton disabled={authLoading} loading={authLoading}>
                            Sign Up <ChevronRight size={16} />
                          </PrimaryButton>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    <p className="text-xs text-center mt-5" style={{ color: 'rgba(25,40,55,0.5)' }}>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => toggleAuthMode('login')}
                        className="font-bold cursor-pointer"
                        style={{ background: 'none', border: 'none', color: 'var(--color-accent)', padding: 0 }}
                      >
                        Sign In
                      </button>
                    </p>
                  </motion.div>
                )}

                {authMode === 'signup' && signupStep === 2 && (
                  <motion.div
                    key="signup-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22 }}
                    className="flex flex-col"
                  >
                    <h3
                      className="text-2xl font-extrabold mb-1"
                      style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
                    >
                      Set Up Workspace
                    </h3>
                    <p className="text-sm mb-6" style={{ color: 'rgba(25,40,55,0.55)' }}>
                      Name your first expense group to start splitting bills.
                    </p>

                    <form
                      onSubmit={(e) => { e.preventDefault(); if (signupForm.workspaceName) setSignupStep(3) }}
                      className="flex flex-col gap-4"
                    >
                      <FormField label="Group / Workspace Name">
                        <input
                          type="text"
                          placeholder="eg. Summer Trip 2026 or Apartment 4B"
                          required
                          value={signupForm.workspaceName}
                          onChange={(e) => setSignupForm({ ...signupForm, workspaceName: e.target.value })}
                          className="auth-input"
                        />
                      </FormField>

                      <FormField label="Default Currency">
                        <select
                          value={signupForm.currency}
                          onChange={(e) => setSignupForm({ ...signupForm, currency: e.target.value })}
                          className="auth-input"
                          style={{ cursor: 'pointer' }}
                        >
                          <option value="USD">USD ($) — US Dollar</option>
                          <option value="EUR">EUR (€) — Euro</option>
                          <option value="GBP">GBP (£) — British Pound</option>
                          <option value="INR">INR (₹) — Indian Rupee</option>
                        </select>
                      </FormField>

                      <div className="flex gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => setSignupStep(1)}
                          className="flex-1 rounded-xl py-3 text-sm font-semibold cursor-pointer transition-colors"
                          style={{ background: 'rgba(25,40,55,0.08)', color: 'var(--color-text)', border: 'none' }}
                        >
                          Back
                        </button>
                        <button
                          className="flex-[2] rounded-xl py-3 text-sm font-semibold cursor-pointer text-white flex items-center justify-center gap-2"
                          style={{ background: '#192837', border: 'none' }}
                        >
                          Continue <ChevronRight size={15} />
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {authMode === 'signup' && signupStep === 3 && (
                  <motion.div
                    key="signup-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22 }}
                    className="flex flex-col"
                  >
                    <h3
                      className="text-2xl font-extrabold mb-1"
                      style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
                    >
                      Personalize
                    </h3>
                    <p className="text-sm mb-6" style={{ color: 'rgba(25,40,55,0.55)' }}>
                      Choose an avatar color and add optional contact info.
                    </p>

                    <form onSubmit={handleCompleteSignup} className="flex flex-col gap-4">
                      {/* Avatar picker */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest block mb-2.5" style={{ color: 'rgba(25,40,55,0.55)' }}>
                          Avatar Color
                        </label>
                        <div className="grid grid-cols-4 gap-2.5">
                          {[
                            { id: 'purple', bg: '#8B5CF6', name: 'Purple' },
                            { id: 'indigo', bg: '#6366F1', name: 'Indigo' },
                            { id: 'emerald', bg: '#10B981', name: 'Emerald' },
                            { id: 'amber', bg: '#F59E0B', name: 'Amber' },
                          ].map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setSignupForm({ ...signupForm, avatar: c.id })}
                              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer"
                              style={{
                                background: signupForm.avatar === c.id ? 'rgba(115,66,226,0.06)' : 'rgba(25,40,55,0.04)',
                                borderColor: signupForm.avatar === c.id ? 'var(--color-accent)' : 'transparent',
                              }}
                            >
                              <div className="w-8 h-8 rounded-full shadow-md" style={{ background: c.bg }} />
                              <span className="text-[10px] font-semibold" style={{ color: 'rgba(25,40,55,0.6)' }}>{c.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <FormField label="Phone (Optional)">
                        <input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={signupForm.phone}
                          onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                          className="auth-input"
                        />
                      </FormField>

                      {authError && <ErrorMsg>{authError}</ErrorMsg>}

                      <div className="flex gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => setSignupStep(2)}
                          className="flex-1 rounded-xl py-3 text-sm font-semibold cursor-pointer transition-colors"
                          style={{ background: 'rgba(25,40,55,0.08)', color: 'var(--color-text)', border: 'none' }}
                        >
                          Back
                        </button>
                        <button
                          className="flex-[2] rounded-xl py-3 text-sm font-semibold cursor-pointer text-white flex items-center justify-center gap-2 disabled:opacity-60"
                          style={{ background: 'var(--color-accent)', border: 'none' }}
                          disabled={authLoading}
                        >
                          {authLoading ? <Loader2 size={16} className="animate-spin" /> : <><span>Complete Setup</span><Check size={15} /></>}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* ═══════════ LOGIN FLOW ═══════════ */}
                {authMode === 'login' && loginStep === 1 && (
                  <motion.div
                    key="login-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.22 }}
                  >
                    <h3
                      className="text-2xl font-extrabold mb-1"
                      style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
                    >
                      Welcome Back
                    </h3>
                    <p className="text-sm mb-6" style={{ color: 'rgba(25,40,55,0.55)' }}>
                      Sign in to access your shared expenses and groups.
                    </p>

                    <AnimatePresence mode="wait">
                      {showPhoneFlow ? (
                        <PhoneFlow
                          key="phone-login"
                          phoneStep={phoneStep}
                          phoneNumber={phoneNumber}
                          setPhoneNumber={setPhoneNumber}
                          otpDigits={otpDigits}
                          otpRefs={otpRefs}
                          authLoading={authLoading}
                          authError={authError}
                          handleSendOTP={handleSendOTP}
                          handleVerifyOTP={handleVerifyOTP}
                          handleOtpDigitChange={handleOtpDigitChange}
                          handleOtpPaste={handleOtpPaste}
                          setOtpDigits={setOtpDigits}
                          setPhoneStep={setPhoneStep}
                          setShowPhoneFlow={setShowPhoneFlow}
                          setAuthError={setAuthError}
                        />
                      ) : (
                        <motion.form
                          key="email-login"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          onSubmit={handleEmailLogin}
                          className="flex flex-col gap-3.5"
                        >
                          <FormField label="Email">
                            <input
                              type="email"
                              placeholder="john@example.com"
                              required
                              value={loginForm.email}
                              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                              className="auth-input"
                            />
                          </FormField>

                          <FormField label="Password">
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                required
                                minLength={8}
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="auth-input pr-11"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                                style={{ background: 'none', border: 'none', color: 'rgba(25,40,55,0.45)', padding: 0 }}
                              >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                            <div className="flex justify-end mt-1">
                              <a
                                href="#forgot"
                                className="text-xs font-semibold"
                                style={{ color: 'rgba(25,40,55,0.45)', textDecoration: 'none' }}
                              >
                                Forgot password?
                              </a>
                            </div>
                          </FormField>

                          {authError && <ErrorMsg>{authError}</ErrorMsg>}

                          <PrimaryButton disabled={authLoading} loading={authLoading}>
                            Sign In <ChevronRight size={16} />
                          </PrimaryButton>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    <p className="text-xs text-center mt-5" style={{ color: 'rgba(25,40,55,0.5)' }}>
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => toggleAuthMode('signup')}
                        className="font-bold cursor-pointer"
                        style={{ background: 'none', border: 'none', color: 'var(--color-accent)', padding: 0 }}
                      >
                        Sign Up
                      </button>
                    </p>
                  </motion.div>
                )}

                {authMode === 'login' && loginStep === 2 && (
                  <motion.div
                    key="login-2"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center py-10 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                      style={{ background: 'rgba(115,66,226,0.12)' }}
                    >
                      <Check size={28} style={{ color: 'var(--color-accent)' }} strokeWidth={2.5} />
                    </motion.div>
                    <h3
                      className="text-2xl font-extrabold mb-2"
                      style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
                    >
                      Signed In!
                    </h3>
                    <p className="text-sm" style={{ color: 'rgba(25,40,55,0.55)' }}>
                      Loading your workspace…
                    </p>
                    <div className="mt-6">
                      <PrimaryButton onClick={() => setLoginStep(3)} loading={false} disabled={false}>
                        Continue <ChevronRight size={16} />
                      </PrimaryButton>
                    </div>
                  </motion.div>
                )}

                {authMode === 'login' && loginStep === 3 && (
                  <motion.div
                    key="login-3"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col items-center py-12 text-center"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, ease: 'easeInOut' }}
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                      style={{ background: 'rgba(16,185,129,0.12)' }}
                    >
                      <Check size={28} style={{ color: '#10B981' }} strokeWidth={2.5} />
                    </motion.div>
                    <h3
                      className="text-2xl font-extrabold mb-2"
                      style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
                    >
                      All Set!
                    </h3>
                    <p className="text-sm" style={{ color: 'rgba(25,40,55,0.55)' }}>
                      Redirecting you to your dashboard…
                    </p>
                    <div className="w-full mt-6 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(25,40,55,0.08)' }}>
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.4, ease: 'easeInOut' }}
                        className="h-full rounded-full"
                        style={{ background: 'var(--color-accent)' }}
                      />
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* reCAPTCHA invisible container */}
      <div id="recaptcha-container-auth" className="hidden" />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label
      className="text-[10px] font-bold uppercase tracking-widest"
      style={{ color: 'rgba(25,40,55,0.55)' }}
    >
      {label}
    </label>
    {children}
  </div>
)

const ErrorMsg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>{children}</p>
)

const Divider: React.FC = () => (
  <div className="flex items-center gap-3 mb-5">
    <div className="flex-1" style={{ height: 1, background: 'rgba(25,40,55,0.1)' }} />
    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(25,40,55,0.4)' }}>or</span>
    <div className="flex-1" style={{ height: 1, background: 'rgba(25,40,55,0.1)' }} />
  </div>
)

const PrimaryButton: React.FC<{
  children: React.ReactNode
  disabled: boolean
  loading: boolean
  onClick?: () => void
}> = ({ children, disabled, loading, onClick }) => (
  <motion.button
    whileHover={!disabled ? { scale: 1.02 } : {}}
    whileTap={!disabled ? { scale: 0.97 } : {}}
    type={onClick ? 'button' : 'submit'}
    onClick={onClick}
    disabled={disabled}
    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold cursor-pointer text-white mt-1 disabled:opacity-60"
    style={{ background: 'var(--color-accent)', border: 'none' }}
  >
    {loading ? <Loader2 size={16} className="animate-spin" /> : children}
  </motion.button>
)

interface SocialButtonProps {
  icon: 'google' | 'phone'
  label: string
  onClick: () => void
  disabled: boolean
}

const SocialButton: React.FC<SocialButtonProps> = ({ icon, label, onClick, disabled }) => (
  <motion.button
    type="button"
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    disabled={disabled}
    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60"
    style={{
      background: 'rgba(25,40,55,0.06)',
      border: '1px solid rgba(25,40,55,0.1)',
      color: 'var(--color-text)',
    }}
  >
    {icon === 'google' ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
      </svg>
    ) : (
      <Phone size={15} />
    )}
    {label}
  </motion.button>
)

interface PhoneFlowProps {
  phoneStep: 'input' | 'otp'
  phoneNumber: string
  setPhoneNumber: (v: string) => void
  otpDigits: string[]
  otpRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
  authLoading: boolean
  authError: string
  handleSendOTP: () => void
  handleVerifyOTP: () => void
  handleOtpDigitChange: (i: number, v: string) => void
  handleOtpPaste: (e: React.ClipboardEvent) => void
  setOtpDigits: (d: string[]) => void
  setPhoneStep: (s: 'input' | 'otp') => void
  setShowPhoneFlow: (v: boolean) => void
  setAuthError: (v: string) => void
}

const PhoneFlow: React.FC<PhoneFlowProps> = ({
  phoneStep, phoneNumber, setPhoneNumber, otpDigits, otpRefs,
  authLoading, authError, handleSendOTP, handleVerifyOTP,
  handleOtpDigitChange, handleOtpPaste, setOtpDigits, setPhoneStep,
  setShowPhoneFlow, setAuthError,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.18 }}
    className="flex flex-col gap-3.5 mb-4"
  >
    <div className="flex items-center justify-between">
      <h4 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
        {phoneStep === 'input' ? 'Continue with Phone' : 'Enter OTP'}
      </h4>
      <button
        type="button"
        onClick={() => { setShowPhoneFlow(false); setPhoneStep('input'); setAuthError('') }}
        className="text-xs cursor-pointer"
        style={{ background: 'none', border: 'none', color: 'rgba(25,40,55,0.45)', padding: 0 }}
      >
        ← Back
      </button>
    </div>

    {phoneStep === 'input' ? (
      <>
        <FormField label="Phone Number">
          <input
            type="tel"
            placeholder="+1 234 567 8900"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="auth-input"
          />
        </FormField>
        <span className="text-[11px]" style={{ color: 'rgba(25,40,55,0.4)' }}>
          Include country code, e.g. +91 9876543210
        </span>
        {authError && <ErrorMsg>{authError}</ErrorMsg>}
        <PrimaryButton disabled={authLoading || !phoneNumber.trim()} loading={authLoading} onClick={handleSendOTP}>
          <Phone size={14} /> Send OTP
        </PrimaryButton>
      </>
    ) : (
      <>
        <p className="text-sm" style={{ color: 'rgba(25,40,55,0.6)' }}>
          Enter the 6-digit code sent to <strong style={{ color: 'var(--color-text)' }}>{phoneNumber}</strong>
        </p>
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
              className="flex-1 text-center text-xl font-bold rounded-xl border-2 focus:outline-none transition-all duration-200"
              style={{
                height: 52,
                background: 'rgba(25,40,55,0.05)',
                borderColor: digit ? 'var(--color-accent)' : 'transparent',
                color: 'var(--color-text)',
              }}
            />
          ))}
        </div>
        {authError && <ErrorMsg>{authError}</ErrorMsg>}
        <PrimaryButton
          disabled={authLoading || otpDigits.join('').length !== 6}
          loading={authLoading}
          onClick={handleVerifyOTP}
        >
          <Check size={14} /> Verify OTP
        </PrimaryButton>
        <button
          type="button"
          onClick={() => { setPhoneStep('input'); setOtpDigits(['','','','','','']); setAuthError('') }}
          className="text-xs text-center cursor-pointer mt-1"
          style={{ background: 'none', border: 'none', color: 'rgba(25,40,55,0.45)' }}
        >
          Resend code
        </button>
      </>
    )}
  </motion.div>
)

export default AuthPage

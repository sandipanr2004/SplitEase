import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightCircle, Zap, LockKeyhole, Fingerprint, Menu, X } from 'lucide-react';

const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" overflow="visible" viewBox="0 0 256 256">
    <path d="M 64 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 L 128 64 L 128 64.5 L 161 32 L 192 0 L 256 0 L 256 64 L 192 128 L 128 128 L 128 192 L 96 223 L 63.5 256 L 0 256 L 0 192 Z M 256 192 L 224 223 L 191.5 256 L 128 256 L 128 192 L 192 128 L 256 128 Z" fill="#192837"/>
  </svg>
);

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
  })
};

const navLinks = ["Features", "Pricing", "About", "Login"];

export default function SignupPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative w-full min-h-screen font-[family-name:var(--font-body)] text-[var(--color-text)] bg-[var(--color-login-bg)] overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 object-cover w-full h-full"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260518_003132_8b7edcb6-c64d-4a52-a9ca-879942e122ad.mp4"
      />

      {/* Navbar */}
      <nav className="relative z-10 max-w-[1280px] mx-auto px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
        <Logo />
        
        <button 
          className="text-[#192837] hover:opacity-80 transition-opacity"
          onClick={() => setIsMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-5 sm:px-8" style={{ paddingTop: 'clamp(40px, 8vw, 72px)' }}>
        <div className="max-w-[560px]">
          <motion.h1
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="font-[family-name:var(--font-heading)] text-[#192837] mb-[24px]"
            style={{
              fontSize: 'clamp(1.65rem, 5vw, 3rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
            }}
          >
            <Zap className="inline-block w-[24px] h-[24px] text-[#192837] relative align-middle top-[-2px] mr-1" />
            Lock Down Your Passwords{' '}
            <LockKeyhole className="inline-block w-[24px] h-[24px] text-[#192837] relative align-middle top-[-2px] mx-1" />
            {' '}with Ironclad Security{' '}
            <Fingerprint className="inline-block w-[24px] h-[24px] text-[#192837] relative align-middle top-[-2px] ml-1" />
          </motion.h1>

          <motion.p
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="font-[family-name:var(--font-body)] max-w-[560px] opacity-80"
            style={{
              fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
              lineHeight: 1.65,
            }}
          >
            Zero stress, total control. VaultShield keeps you covered with unbreakable storage, one-tap access, and pro-grade tools for your non-stop world.
          </motion.p>

          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-8"
          >
            <button
              className="flex justify-between items-center bg-[#7342E2] text-white rounded-[50px] font-[family-name:var(--font-body)] font-semibold transition-all hover:scale-[1.04] hover:brightness-110 active:scale-[0.96]"
              style={{
                padding: '17px 24px',
                fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                boxShadow: '0 4px 24px rgba(115,66,226,0.28)',
                minWidth: '210px',
                gap: '32px'
              }}
            >
              <span>Get It Free</span>
              <ArrowRightCircle size={20} />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Mobile Menu Sheet */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-[rgba(25,40,55,0.35)] backdrop-blur-[4px]"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.45 }}
              className="fixed right-0 top-0 z-50 h-[100dvh] bg-[#CFC8C5] flex flex-col"
              style={{
                width: 'min(88vw, 360px)',
                boxShadow: '-12px 0 48px rgba(25,40,55,0.18)'
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5 border-b border-[#192837]/10">
                <Logo />
                <button onClick={() => setIsMenuOpen(false)}>
                  <X className="w-6 h-6 text-[#192837]" />
                </button>
              </div>

              {/* Nav Links */}
              <div className="flex flex-col p-6 gap-6 flex-1">
                {navLinks.map((link, i) => (
                  <motion.a
                    key={link}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + i * 0.07, duration: 0.4, ease: "easeOut" }}
                    href="#"
                    className="text-lg font-medium text-[#192837]"
                  >
                    {link}
                  </motion.a>
                ))}
              </div>

              {/* Bottom CTA */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <motion.button
                  className="w-full flex justify-between items-center bg-[#7342E2] text-white rounded-[50px] font-[family-name:var(--font-body)] font-semibold transition-all hover:scale-[1.04] hover:brightness-110 active:scale-[0.96]"
                  style={{
                    padding: '17px 24px',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                    boxShadow: '0 4px 24px rgba(115,66,226,0.28)',
                  }}
                >
                  <span>Get It Free</span>
                  <ArrowRightCircle size={20} />
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

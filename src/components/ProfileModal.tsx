import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Phone, Mail, Camera, Shield, LogOut } from 'lucide-react'

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  userProfile: any;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, userProfile, onLogout }) => {
  if (!user) return null;

  const displayName = userProfile?.firstName 
    ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() 
    : (user.displayName && user.displayName !== user.email?.split('@')[0] ? user.displayName.split(' ')[0] : 'User')

  const initial = userProfile?.firstName?.charAt(0).toUpperCase() || user.displayName?.charAt(0).toUpperCase() || 'U'

  const avatarColorClass = 
    userProfile?.avatar === 'indigo' ? 'bg-indigo-500' :
    userProfile?.avatar === 'emerald' ? 'bg-emerald-500' :
    userProfile?.avatar === 'amber' ? 'bg-amber-500' : 'bg-purple-500'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />

          {/* Modal Panel (Slide from Right) */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col z-10 overflow-hidden"
          >
            {/* Header Graphic Area */}
            <div className="h-48 w-full relative overflow-hidden shrink-0">
              <img 
                src="/geometric-bg.png" 
                alt="Profile Graphic" 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-colors border border-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Avatar Overlapping Header */}
              <div className="absolute -bottom-10 left-6">
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black text-white shadow-xl border-4 border-white ${avatarColorClass} rotate-3`}>
                  {initial}
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 pt-16 pb-6">
              <div className="flex flex-col gap-1 mb-8">
                <h2 className="text-3xl font-extrabold text-black tracking-tight">{displayName}</h2>
                <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  Online
                </div>
              </div>

              {/* Details Sections */}
              <div className="flex flex-col gap-6">
                
                {/* Account Details */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Account Details
                  </h3>
                  
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Email Address</label>
                      <div className="flex items-center gap-3 mt-1 text-gray-800 font-semibold">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {user.email || 'No email associated'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Phone Number</label>
                      <div className="flex items-center gap-3 mt-1 text-gray-800 font-semibold">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {userProfile?.phone || user.phoneNumber || 'Not provided'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" /> Security & Privacy
                  </h3>
                  
                  <div className="flex flex-col gap-3">
                    <button className="flex items-center justify-between w-full py-2 bg-transparent border-none text-left cursor-pointer group">
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-black">Change Password</span>
                      <div className="bg-white border border-gray-200 px-2 py-1 rounded shadow-sm text-[10px] font-bold text-gray-500">Update</div>
                    </button>
                    <div className="h-px bg-gray-200 w-full my-1" />
                    <button className="flex items-center justify-between w-full py-2 bg-transparent border-none text-left cursor-pointer group">
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-black">Two-Factor Authentication</span>
                      <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded shadow-sm text-[10px] font-bold">Enabled</div>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Logout */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 shrink-0">
              <button
                onClick={() => {
                  onClose()
                  onLogout()
                }}
                className="w-full py-3.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out from SplitEase
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

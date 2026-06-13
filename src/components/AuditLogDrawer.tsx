import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Loader2, Clock } from 'lucide-react';
import { getAuditLogs } from '../db';
import type { AuditLog } from '../db';

interface AuditLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({ isOpen, onClose, groupId }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, groupId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs(groupId);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Activity Logs
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1" data-lenis-prevent="true">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center text-gray-500 p-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No recent activity found.</p>
              </div>
            ) : (
              <motion.div 
                className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.15
                    }
                  }
                }}
              >
                {logs.map((log) => (
                  <motion.div 
                    key={log.id} 
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    <motion.div 
                      className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-indigo-50 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"
                      whileHover={{ scale: 1.2, rotate: 15 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Activity className="w-4 h-4" />
                    </motion.div>
                    <motion.div 
                      className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer relative"
                      whileHover={{ 
                        scale: 1.03, 
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                        borderColor: "#818cf8"
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-slate-900 text-sm">{log.action}</div>
                        <time className="text-xs font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </time>
                      </div>
                      <div className="text-slate-500 text-sm mt-2">{log.details}</div>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Loader2 } from 'lucide-react';
import { recordSettlement } from '../db';
import { auth } from '../firebase';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess: (settlement?: any) => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({ isOpen, onClose, groupId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [method, setMethod] = useState('cash');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !paidTo || !paidBy) return;
    
    setLoading(true);
    setError('');

    try {
      const settlementObj = {
        id: Date.now().toString(),
        group_id: groupId,
        paid_by: paidBy,
        paid_to: paidTo,
        amount: parseFloat(amount),
        method,
        date: new Date().toISOString()
      };
      
      try {
        await recordSettlement(settlementObj);
      } catch (e) {
        console.warn('Backend not available, saving to local state');
      }
      
      onSuccess(settlementObj);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record settlement');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Settle Up
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid by (Name)</label>
                <input
                  type="text"
                  required
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter payer..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid to (Name)</label>
                <input
                  type="text"
                  required
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter recipient..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="paypal">PayPal / Venmo</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Record Settlement'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import { uploadBulkExpenses } from '../db';
import type { ExpenseItem } from '../db';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, groupId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const expenses: ExpenseItem[] = results.data.map((row: any) => ({
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            groupId,
            description: row.description || 'Imported Expense',
            amount: parseFloat(row.amount) || 0,
            paidBy: row.paidBy || '',
            splitType: row.splitType || 'equal',
            date: row.date || new Date().toISOString().split('T')[0],
            category: row.category || 'general',
            currency: row.currency || 'USD',
            exchangeRate: parseFloat(row.exchangeRate) || 1.0
          }));

          await uploadBulkExpenses(groupId, expenses);
          onSuccess();
          onClose();
        } catch (err: any) {
          setError(err.message || 'Failed to import CSV');
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        setError(error.message);
        setLoading(false);
      }
    });
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
              <FileSpreadsheet className="w-5 h-5 text-purple-600" />
              Import Expenses
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-gray-600 mb-6 text-sm">
              Upload a CSV file to bulk import expenses. Your CSV should include headers like: <code>description</code>, <code>amount</code>, <code>paidBy</code>, <code>date</code>.
            </p>

            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              {loading ? (
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400 mb-3" />
              )}
              <span className="text-sm font-medium text-gray-900">
                {loading ? 'Processing...' : 'Click or drag CSV to upload'}
              </span>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                {error}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

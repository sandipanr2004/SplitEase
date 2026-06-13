import React, { useState, useEffect } from 'react';
import { FileClock, Loader2, ArrowLeft } from 'lucide-react';
import { getImportHistory } from '../db';

import { FeaturePageLayout } from './FeaturePages';

export const FeatureImportHistory = ({ onBack, activeGroupId }: any) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getImportHistory(activeGroupId);
        setHistory(data);
      } catch (err) {
        console.error("Failed to load import history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [activeGroupId]);

  return (
    <FeaturePageLayout title="Import History" icon={<FileClock className="w-8 h-8 text-amber-600" />} onBack={onBack}>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 sticky top-0">
              <tr>
                <th className="px-6 py-4 font-bold whitespace-nowrap">Import ID</th>
                <th className="px-6 py-4 font-bold whitespace-nowrap">Date</th>
                <th className="px-6 py-4 font-bold whitespace-nowrap">Rows Imported</th>
                <th className="px-6 py-4 font-bold whitespace-nowrap">Issues Fixed</th>
                <th className="px-6 py-4 font-bold whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
                    Loading history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No import history found for this group.
                  </td>
                </tr>
              ) : (
                history.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">#{row.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(row.date).toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{row.rows_imported}</td>
                    <td className="px-6 py-4 text-amber-600 font-medium">{row.issues_fixed}</td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </FeaturePageLayout>
  );
};

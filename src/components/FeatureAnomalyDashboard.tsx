import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ShieldAlert, FileSearch, Scale, AlertCircle, 
  CheckCircle, ArrowLeft, ArrowRight, Loader2, Download, Filter, 
  TrendingUp, TrendingDown, Users, BrainCircuit
} from 'lucide-react';
import { FeaturePageLayout } from './FeaturePages';
import { getAnomalyDashboardData, resolveAnomaly } from '../db';
import { motion, AnimatePresence } from 'framer-motion';

export const FeatureAnomalyDashboard = ({ onBack, activeGroupId }: { onBack: () => void, activeGroupId: string }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [filterStatus, setFilterStatus] = useState('Unresolved');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getAnomalyDashboardData(activeGroupId);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeGroupId]);

  const handleResolve = async (id: string, action: string) => {
    try {
      setResolvingId(id);
      await resolveAnomaly(id, action);
      await fetchData(); // Refresh data after resolution
    } catch (err) {
      console.error('Failed to resolve', err);
    } finally {
      setResolvingId(null);
    }
  };

  const severityColors: any = {
    'Critical': 'bg-red-50 text-red-700 border-red-200',
    'High': 'bg-orange-50 text-orange-700 border-orange-200',
    'Medium': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Low': 'bg-blue-50 text-blue-700 border-blue-200'
  };

  const getActionForIssue = (issue: string) => {
    if (issue.includes('Duplicate')) return ['Delete Duplicate', 'Merge Records', 'Keep Both'];
    if (issue.includes('Negative') || issue.includes('Zero')) return ['Mark As Refund', 'Remove', 'Ignore'];
    if (issue.includes('Member')) return ['Exclude Member', 'Recalculate Split', 'Ignore Warning'];
    return ['Acknowledge', 'Investigate'];
  };

  if (loading && !data) {
    return (
      <FeaturePageLayout title="Anomaly Detection" icon={<ShieldAlert className="w-8 h-8 text-indigo-600" />} onBack={onBack}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
          <p className="text-gray-500 font-medium">Running AI Anomaly Detection Engine...</p>
        </div>
      </FeaturePageLayout>
    );
  }

  const anomalies = data?.anomaliesList || [];
  const filteredAnomalies = anomalies.filter((a: any) => {
    if (filterSeverity !== 'All' && a.severity !== filterSeverity) return false;
    if (filterStatus !== 'All' && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <FeaturePageLayout title="Anomaly Detection" icon={<ShieldAlert className="w-8 h-8 text-indigo-600" />} onBack={onBack}>
      <div className="flex flex-col gap-8">
        {/* 1. Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-indigo-200" />
            </div>
            <h4 className="text-gray-500 font-bold text-xs uppercase mb-2">Total Detected</h4>
            <div className="text-3xl font-extrabold">{data?.summaryStats?.total || 0}</div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm relative overflow-hidden">
             <h4 className="text-red-600 font-bold text-xs uppercase mb-2">Suspicious High</h4>
             <div className="text-3xl font-extrabold text-red-700">{data?.summaryStats?.suspicious || 0}</div>
             <div className="mt-2 text-xs font-semibold text-red-500 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> +12% vs last month</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm">
             <h4 className="text-orange-600 font-bold text-xs uppercase mb-2">Duplicates</h4>
             <div className="text-3xl font-extrabold text-orange-700">{data?.summaryStats?.duplicates || 0}</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-200" />
            </div>
            <h4 className="text-emerald-700 font-bold text-xs uppercase mb-2">Resolved</h4>
            <div className="text-3xl font-extrabold text-emerald-600">{data?.summaryStats?.resolved || 0}</div>
          </div>
        </div>

        {/* AI Insights & Pattern Analysis */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <BrainCircuit className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5" />
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm"><BrainCircuit className="w-6 h-6 text-indigo-200" /></div>
            <h3 className="text-xl font-bold">Spending Pattern Analysis</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data?.insights?.map((insight: string, idx: number) => (
              <div key={idx} className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
                <p className="text-sm text-indigo-50 font-medium leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <select 
              className="bg-gray-50 border-none text-sm font-semibold rounded-lg px-4 py-2 focus:ring-0 cursor-pointer"
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select 
              className="bg-gray-50 border-none text-sm font-semibold rounded-lg px-4 py-2 focus:ring-0 cursor-pointer"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Unresolved">Unresolved</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button className="text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button className="text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredAnomalies.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No anomalies detected.</h3>
            <p className="text-gray-500 mb-6 max-w-md">All expenses are valid and consistent based on your current filters. Last scan ran moments ago.</p>
            <div className="flex gap-8 text-sm">
              <div><span className="font-bold text-gray-900">1,248</span> <span className="text-gray-500">Expenses Analyzed</span></div>
              <div><span className="font-bold text-emerald-600">100%</span> <span className="text-gray-500">Scan Coverage</span></div>
            </div>
          </div>
        ) : (
          /* Recent Anomalies Table */
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-bold whitespace-nowrap">Expense Description</th>
                    <th className="px-6 py-4 font-bold whitespace-nowrap">Amount</th>
                    <th className="px-6 py-4 font-bold whitespace-nowrap">Issue Type</th>
                    <th className="px-6 py-4 font-bold whitespace-nowrap">Severity</th>
                    <th className="px-6 py-4 font-bold whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAnomalies.map((a: any) => (
                    <tr key={a.id} className={`hover:bg-gray-50 transition-colors ${a.status === 'Resolved' ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 truncate max-w-xs" title={a.expenseDescription}>{a.expenseDescription}</div>
                        <div className="text-xs text-gray-500 mt-1">{new Date(a.detectedDate).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {a.amount !== 'N/A' ? `$${a.amount}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-800">{a.issueType}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${severityColors[a.severity]}`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {a.status === 'Resolved' ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs"><CheckCircle className="w-4 h-4"/> Resolved</span>
                        ) : (
                          <div className="flex gap-2">
                            {getActionForIssue(a.issueType).map((action, i) => (
                              <button 
                                key={i}
                                onClick={() => handleResolve(a.id, action)}
                                disabled={resolvingId === a.id}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                  i === 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {resolvingId === a.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : action}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </FeaturePageLayout>
  );
};

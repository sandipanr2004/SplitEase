import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, UserMinus, CalendarClock, History, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle, Calculator, Info,
  Loader2, Filter, ArrowRight
} from 'lucide-react';
import { FeaturePageLayout } from './FeaturePages';
import { getGroupTimelineData, resolveTimelineConflict } from '../db';

export const FeatureMemberTimelineDashboard = ({ onBack, activeGroupId }: { onBack: () => void, activeGroupId: string }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getGroupTimelineData(activeGroupId);
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

  const handleResolve = async (splitId: string, expenseId: string, action: string) => {
    try {
      setResolvingId(splitId);
      await resolveTimelineConflict(activeGroupId, splitId, expenseId, action);
      await fetchData(); // Refresh data after resolution
    } catch (err) {
      console.error('Failed to resolve', err);
    } finally {
      setResolvingId(null);
    }
  };

  if (loading && !data) {
    return (
      <FeaturePageLayout title="Member Timeline" icon={<CalendarClock className="w-8 h-8 text-orange-600" />} onBack={onBack}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mb-4" />
          <p className="text-gray-500 font-medium">Analyzing temporal membership constraints...</p>
        </div>
      </FeaturePageLayout>
    );
  }

  const memberships = data?.memberships || [];
  const conflicts = data?.conflicts || [];
  const prorated = data?.prorated || [];
  const auditLogs = data?.auditLogs || [];

  const activeCount = memberships.filter((m: any) => !m.left_at).length;
  const joinedRecent = memberships.filter((m: any) => m.joined_at && new Date(m.joined_at) > new Date(Date.now() - 30*86400000)).length;
  const leftRecent = memberships.filter((m: any) => m.left_at && new Date(m.left_at) > new Date(Date.now() - 30*86400000)).length;

  return (
    <FeaturePageLayout title="Member Join/Leave Tracking" icon={<CalendarClock className="w-8 h-8 text-orange-600" />} onBack={onBack}>
      <div className="flex flex-col gap-8">
        {/* 1. Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <h4 className="text-gray-500 font-bold text-xs uppercase mb-2">Total Active</h4>
            <div className="text-3xl font-extrabold flex items-center gap-2">
              {activeCount} <Users className="w-6 h-6 text-indigo-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
             <h4 className="text-emerald-600 font-bold text-xs uppercase mb-2">Joined (30d)</h4>
             <div className="text-3xl font-extrabold text-emerald-700 flex items-center gap-2">
               {joinedRecent} <UserPlus className="w-6 h-6 text-emerald-500" />
             </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
             <h4 className="text-orange-600 font-bold text-xs uppercase mb-2">Left (30d)</h4>
             <div className="text-3xl font-extrabold text-orange-700 flex items-center gap-2">
               {leftRecent} <UserMinus className="w-6 h-6 text-orange-500" />
             </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
             <h4 className="text-blue-600 font-bold text-xs uppercase mb-2">Prorated</h4>
             <div className="text-3xl font-extrabold text-blue-700 flex items-center gap-2">
               {prorated.length} <Calculator className="w-6 h-6 text-blue-500" />
             </div>
          </div>

          <div className={`bg-white rounded-2xl p-6 shadow-sm border ${conflicts.length > 0 ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
             <h4 className={`${conflicts.length > 0 ? 'text-red-600' : 'text-gray-500'} font-bold text-xs uppercase mb-2`}>Conflicts</h4>
             <div className={`text-3xl font-extrabold flex items-center gap-2 ${conflicts.length > 0 ? 'text-red-700' : 'text-gray-900'}`}>
               {conflicts.length} {conflicts.length > 0 && <AlertTriangle className="w-6 h-6 text-red-500" />}
             </div>
          </div>
        </div>

        {/* Empty State / All Clear */}
        {conflicts.length === 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-8 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 shadow-inner">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-900 mb-1">Timeline Engine Active</h3>
                <p className="text-emerald-700 font-medium">All group expenses are correctly adjusted based on membership dates.</p>
              </div>
            </div>
            <div className="hidden md:flex gap-8 text-sm bg-white/60 p-4 rounded-xl border border-white">
              <div><div className="text-emerald-600/70 font-bold uppercase text-[10px] tracking-wider mb-1">Groups Monitored</div><div className="font-extrabold text-lg">1</div></div>
              <div><div className="text-emerald-600/70 font-bold uppercase text-[10px] tracking-wider mb-1">Members Tracked</div><div className="font-extrabold text-lg">{memberships.length}</div></div>
              <div><div className="text-emerald-600/70 font-bold uppercase text-[10px] tracking-wider mb-1">Conflicts Found</div><div className="font-extrabold text-lg text-emerald-600">0</div></div>
            </div>
          </div>
        )}

        {/* 5. Conflict Resolution Table */}
        {conflicts.length > 0 && (
          <div className="bg-white border border-red-200 rounded-3xl overflow-hidden shadow-xl shadow-red-900/5">
            <div className="bg-red-50/50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-red-900">Timeline Conflicts Detected</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-bold">Issue</th>
                    <th className="px-6 py-4 font-bold">Member</th>
                    <th className="px-6 py-4 font-bold">Expense</th>
                    <th className="px-6 py-4 font-bold">Suggested Fix</th>
                    <th className="px-6 py-4 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {conflicts.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-semibold text-red-700">
                          <AlertTriangle className="w-4 h-4" /> {c.issue}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{c.member.split('@')[0]}</td>
                      <td className="px-6 py-4 text-gray-600">{c.expense}</td>
                      <td className="px-6 py-4"><span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">{c.suggestedFix}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleResolve(c.splitId, c.expenseId, 'Recalculate Split')}
                            disabled={resolvingId === c.splitId}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                          >
                            {resolvingId === c.splitId ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Recalculate Split'}
                          </button>
                          <button 
                            onClick={() => handleResolve(c.splitId, c.expenseId, 'Exclude Member')}
                            disabled={resolvingId === c.splitId}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                          >
                            Exclude
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 2. Group Membership Timeline */}
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500"/> Group Timeline</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Member Name</th>
                    <th className="px-6 py-3 font-semibold">Joined On</th>
                    <th className="px-6 py-3 font-semibold">Left On</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {memberships.map((m: any) => (
                    <tr key={m.id}>
                      <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold uppercase">
                          {m.user_uid.charAt(0)}
                        </div>
                        {m.user_uid.split('@')[0]}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-600">{m.left_at ? new Date(m.left_at).toLocaleDateString() : 'Active'}</td>
                      <td className="px-6 py-4">
                        {m.left_at ? (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">Left</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-xs font-bold">Current</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Expense Impact Analysis & Proration */}
          <div className="bg-gradient-to-br from-gray-900 to-black text-white rounded-3xl p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl mix-blend-screen" />
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <Calculator className="w-6 h-6 text-indigo-400" />
              <h3 className="font-bold text-xl">Proration Engine</h3>
            </div>
            
            <div className="space-y-6 relative z-10">
              {prorated.length > 0 ? prorated.map((p: any, i: number) => (
                <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                    <div className="font-bold text-lg">{p.description}</div>
                    <div className="font-extrabold text-indigo-300">${p.amount}</div>
                  </div>
                  <div className="space-y-3">
                    {p.splits.map((s: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold uppercase">{s.userUid.charAt(0)}</div>
                          <span className="text-gray-300">{s.userUid.split('@')[0]}</span>
                          {s.daysPresent < 30 && <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded text-[10px] font-bold ml-2">{s.notes}</span>}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-400 font-mono text-xs">{s.daysPresent} / 30 days</span>
                          <span className="font-bold text-white">${parseFloat(s.amount).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10">
                  <Info className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                  <div className="text-sm text-indigo-200">No recurring expenses (Rent/Internet) found to prorate.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 7. Audit Log */}
        {auditLogs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><History className="w-5 h-5 text-gray-400"/> Membership Audit Log</h3>
            <div className="space-y-4">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                    <History className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-gray-900">{log.action}</div>
                      <div className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{new Date(log.timestamp).toLocaleDateString()}</div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{log.details}</p>
                    <div className="text-xs font-bold text-indigo-600">By {log.user_uid}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FeaturePageLayout>
  );
};

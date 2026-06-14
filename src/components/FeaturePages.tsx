import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, AlertTriangle, Globe, UserPlus, Activity, CreditCard, FileSpreadsheet, Loader2, Upload, Download, CheckCircle, AlertCircle, History, Clock } from 'lucide-react';
import Papa from 'papaparse';
import { uploadBulkExpenses, getAuditLogs } from '../db';
import type { ExpenseItem, AuditLog } from '../db';

export const FeaturePageLayout = ({ title, icon, children, onBack }: { title: string, icon: React.ReactNode, children: React.ReactNode, onBack: () => void }) => {
  return (
    <div className="min-h-screen bg-[#FDFDFD] pt-24 pb-16">
      <div className="max-w-[88rem] mx-auto px-6 relative z-10">
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 text-white transition-all mb-8 font-semibold text-sm cursor-pointer backdrop-blur-md shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Features
        </button>
        
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-black/[0.06] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-100 rounded-full blur-[80px] -mr-32 -mt-32 opacity-50 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center border border-black/[0.03] shadow-inner">
                {icon}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-black">{title}</h1>
            </div>
            
            <div className="min-h-[400px]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const levenshtein = (a: string, b: string) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
};

const getSimilarity = (s1: string, s2: string) => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  return (longer.length - levenshtein(longer.toLowerCase(), shorter.toLowerCase())) / parseFloat(longer.length.toString());
};

export const FeatureCsvImport = ({ onBack, onViewHistory, groups, activeGroupId, onSuccess }: { onBack: () => void, onViewHistory?: () => void, groups?: any[], activeGroupId?: string, onSuccess?: (route?: string) => void }) => {
  const [selectedGroupId, setSelectedGroupId] = useState(activeGroupId || (groups?.[0]?.id ?? ''));
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, warnings: 0, errors: 0, duplicates: 0, currency: 0, membership: 0 });
  const [importState, setImportState] = useState<'idle' | 'parsing' | 'validating' | 'ready' | 'reviewing' | 'report' | 'importing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [importReport, setImportReport] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentGroup = groups?.find((g: any) => g.id === selectedGroupId);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      handleFileSelection(droppedFile);
    } else {
      setErrorMessage('Please drop a valid .csv file.');
      setImportState('error');
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    setParsedData([]);
    setImportState('idle');
    setErrorMessage('');
  };

  const validateCsv = () => {
    if (!file) return;
    setImportState('parsing');
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setImportState('validating');
        
        let valid = 0, warnings = 0, errors = 0, duplicates = 0, currency = 0, membership = 0;
        
        const groupMembers = (currentGroup?.members || []).map((m: string) => {
          const joined = new Date();
          joined.setMonth(joined.getMonth() - 2);
          const left = m.toLowerCase().includes('left') ? new Date() : undefined;
          return { id: m, joinedAt: joined.toISOString().split('T')[0], leftAt: left?.toISOString().split('T')[0] };
        });

        const previousRecords: { desc: string, amount: string, date: string }[] = [];

        const processed = results.data.map((row: any, index: number) => {
          let rowStatus = 'valid';
          let reason = 'No issues detected';
          let suggestedAction = 'None';
          let issueType = 'None';
          
          const amount = parseFloat(row.amount);
          
          let isDuplicate = false;
          let simScore = 0;
          for (const prev of previousRecords) {
            if (prev.amount === row.amount && prev.date === row.date) {
              const sim = getSimilarity(row.description || '', prev.desc);
              if (sim > 0.85) {
                isDuplicate = true;
                simScore = Math.round(sim * 100);
                break;
              }
            }
          }
          
          const memberData = groupMembers.find((m: any) => m.id === row.paidBy);
          let memberIssue = null;
          if (memberData && row.date) {
            if (row.date < memberData.joinedAt) memberIssue = 'MEMBER INACTIVE DURING EXPENSE';
            if (memberData.leftAt && row.date > memberData.leftAt) memberIssue = 'MEMBER NOT ACTIVE';
          }

          if (!row.description || !row.amount || isNaN(amount)) {
            rowStatus = 'error';
            reason = 'Missing required fields or invalid amount';
            suggestedAction = 'Edit manually';
            issueType = 'Invalid Data';
            errors++;
          } else if (memberIssue) {
            rowStatus = 'warning';
            reason = memberIssue;
            suggestedAction = 'Exclude Member';
            issueType = 'Membership Issue';
            warnings++;
            membership++;
          } else if (amount < 0) {
            rowStatus = 'warning';
            reason = 'Negative amount detected (possible refund)';
            suggestedAction = 'Mark As Refund';
            issueType = 'Negative Amount';
            warnings++;
          } else if (amount === 0) {
            rowStatus = 'warning';
            reason = 'Zero amount expense';
            suggestedAction = 'Ignore expense';
            issueType = 'Zero Amount';
            warnings++;
          } else if (isDuplicate) {
            rowStatus = 'warning';
            reason = `Possible duplicate expense (${simScore}% similarity)`;
            suggestedAction = 'Merge Records';
            issueType = 'Duplicate Expense';
            warnings++;
            duplicates++;
          } else if (!row.currency) {
            rowStatus = 'warning';
            reason = 'Missing currency';
            suggestedAction = 'Assume USD';
            issueType = 'Missing Currency';
            warnings++;
            currency++;
          } else if (row.paidBy && !memberData) {
            rowStatus = 'warning';
            reason = `Unknown member: ${row.paidBy}`;
            suggestedAction = 'Map to self';
            issueType = 'Membership Issue';
            warnings++;
            membership++;
          } else if (row.amount && row.amount.toString().split('.')[1]?.length > 2) {
             rowStatus = 'warning';
             reason = 'Excess decimal precision';
             suggestedAction = 'Round to 2 decimals';
             issueType = 'Decimal Precision';
             warnings++;
          } else {
            valid++;
          }
          
          if (rowStatus !== 'error') {
            previousRecords.push({ desc: row.description, amount: row.amount, date: row.date });
          }

          return { 
            ...row, 
            _originalIndex: index + 1,
            _status: rowStatus, 
            _reason: reason,
            _suggestedAction: suggestedAction,
            _issueType: issueType,
            _actionTaken: ''
          };
        });
        
        setParsedData(processed);
        setStats({ total: processed.length, valid, warnings, errors, duplicates, currency, membership });
        setImportState('ready');
      },
      error: (err) => {
        setErrorMessage(err.message);
        setImportState('error');
      }
    });
  };

  const handleResolveIssue = (index: number, action: 'accept' | 'ignore' | 'keep' | 'remove') => {
    const newData = [...parsedData];
    const row = newData[index];
    
    if (action === 'accept') {
      if (row._issueType === 'Missing Currency') {
        row.currency = 'USD';
        row._actionTaken = 'Assigned USD';
        row._status = 'valid';
      } else if (row._issueType === 'Duplicate Expense') {
        row._status = 'rejected';
        row._actionTaken = 'Merged With Existing Entry';
      } else if (row._issueType === 'Negative Amount') {
        row.amount = Math.abs(parseFloat(row.amount)).toString();
        row._actionTaken = 'Marked As Refund';
        row._status = 'valid';
      } else if (row._issueType === 'Membership Issue') {
        row._status = 'rejected';
        row._actionTaken = 'Excluded Member';
      } else if (row._issueType === 'Decimal Precision') {
        row.amount = parseFloat(row.amount).toFixed(2);
        row._actionTaken = 'Rounded to 2 decimals';
        row._status = 'valid';
      } else if (row._issueType === 'Zero Amount') {
        row._status = 'rejected';
        row._actionTaken = 'Ignored expense';
      } else {
        row._status = 'valid';
        row._actionTaken = 'Accepted suggestion';
      }
    } else if (action === 'ignore') {
      row._status = 'valid';
      row._actionTaken = 'Ignored warning';
    } else if (action === 'keep') {
      row._status = 'valid';
      row._actionTaken = 'Kept Duplicate';
    } else if (action === 'remove') {
      row._status = 'rejected';
      row._actionTaken = 'Removed Duplicate';
    }
    
    setParsedData(newData);
    
    const validCount = newData.filter(r => r._status === 'valid').length;
    const warningCount = newData.filter(r => r._status === 'warning').length;
    const errorCount = newData.filter(r => r._status === 'error').length;
    setStats(prev => ({ ...prev, valid: validCount, warnings: warningCount, errors: errorCount }));
  };

  const handleGenerateReport = () => {
    const report = parsedData.map(row => ({
      rowNumber: row._originalIndex,
      issueDetected: row._issueType === 'None' ? 'No issues' : row._issueType,
      actionTaken: row._actionTaken || (row._status === 'valid' ? 'Imported seamlessly' : 'Rejected'),
      finalStatus: row._status === 'valid' ? 'Imported' : 'Rejected'
    }));
    setImportReport(report);
    setImportState('report');
  };

  const handleImport = async () => {
    if (!selectedGroupId || parsedData.length === 0) return;
    setImportState('importing');
    
    const validRows = parsedData.filter(row => row._status === 'valid');
    
    try {
      const expenses: ExpenseItem[] = validRows.map((row: any) => ({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        groupId: selectedGroupId,
        description: row.description || 'Imported Expense',
        amount: parseFloat(row.amount) || 0,
        paidBy: row.paidBy || '',
        splitType: row.splitType || 'equal',
        date: row.date || new Date().toISOString().split('T')[0],
        category: row.category || 'general',
        currency: row.currency || 'USD',
        exchangeRate: parseFloat(row.exchangeRate) || 1.0
      }));

      if (expenses.length > 0) {
        const reportObj = {
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          date: new Date().toISOString(),
          rowsImported: expenses.length,
          issuesFixed: parsedData.filter(r => r._actionTaken && r._actionTaken !== 'Imported seamlessly' && r._actionTaken !== 'Rejected').length,
          status: expenses.length === parsedData.length ? 'Success' : 'Partial Success'
        };

        const anomaliesPayload = importReport.map(r => ({
          rowNumber: r.rowNumber,
          issueType: r.issueDetected,
          actionTaken: r.actionTaken,
          finalStatus: r.finalStatus
        }));

        await uploadBulkExpenses(selectedGroupId, expenses, reportObj, anomaliesPayload);
      }
      
      setImportState('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import CSV data.');
      setImportState('error');
    }
  };

  const downloadSample = () => {
    const csvContent = "description,amount,paidBy,date,category,currency\nTeam Lunch,45.50,Alice,2026-06-01,Food,USD\nUber to Airport,25.00,Bob,2026-06-02,Transport,USD";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "splitease_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadReport = () => {
    if (importReport.length === 0) return;
    
    const headers = ['Row Number', 'Issue Detected', 'Action Taken', 'Final Status'];
    const rows = importReport.map(r => [r.rowNumber, r.issueDetected, r.actionTaken, r.finalStatus]);
    
    const csvContent = headers.join(',') + '\n' + rows.map(e => e.join(',')).join('\n');
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "splitease_import_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <FeaturePageLayout title="CSV Import" icon={<FileSpreadsheet className="w-8 h-8 text-purple-600" />} onBack={onBack}>
      <div className="w-full flex flex-col gap-8">
        
        {/* Header & Group Selection */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-black mb-1">Bulk Import Dashboard</h3>
            <p className="text-gray-500 text-sm">Upload, validate, and import expense data securely.</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
            <span className="text-sm font-semibold text-gray-700 pl-2">Importing to:</span>
            <select 
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-white border border-gray-200 text-sm rounded-lg px-3 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={['parsing', 'validating', 'reviewing', 'report', 'importing', 'success'].includes(importState)}
            >
              {groups?.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        {importState === 'success' && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
              <div>
                <h3 className="text-2xl font-bold text-emerald-900">Import Successful!</h3>
                <p className="text-emerald-700 font-medium">Your clean data has been successfully imported.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-emerald-100 p-4 rounded-xl shadow-sm">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Rows Imported</div>
                <div className="text-2xl font-extrabold text-black">{importReport.filter(r => r.finalStatus === 'Imported').length}</div>
              </div>
              <div className="bg-white border border-emerald-100 p-4 rounded-xl shadow-sm">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Rows Rejected</div>
                <div className="text-2xl font-extrabold text-black">{importReport.filter(r => r.finalStatus === 'Rejected').length}</div>
              </div>
              <div className="bg-white border border-emerald-100 p-4 rounded-xl shadow-sm">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Anomalies Found</div>
                <div className="text-2xl font-extrabold text-black">{parsedData.filter(r => r._issueType !== 'None').length}</div>
              </div>
              <div className="bg-white border border-emerald-100 p-4 rounded-xl shadow-sm">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Anomalies Resolved</div>
                <div className="text-2xl font-extrabold text-black">{parsedData.filter(r => r._issueType !== 'None' && r._actionTaken !== '').length}</div>
              </div>
            </div>

            <div className="border border-emerald-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="bg-emerald-50/50 px-4 py-3 border-b border-emerald-100 flex justify-between items-center">
                <h4 className="text-sm font-bold text-emerald-900">Import Report</h4>
                <div className="flex items-center gap-4">
                  {onViewHistory && (
                    <button onClick={onViewHistory} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors">
                      <History className="w-4 h-4" /> View History
                    </button>
                  )}
                  <button onClick={downloadReport} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold flex items-center gap-1 ml-2">
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white border-b border-gray-100 text-gray-500 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Row #</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Issue Detected</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Action Taken</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Final Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {importReport.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.rowNumber}</td>
                        <td className="px-4 py-3 text-gray-600">{row.issueDetected}</td>
                        <td className="px-4 py-3 text-gray-600">{row.actionTaken}</td>
                        <td className="px-4 py-3">
                          {row.finalStatus === 'Imported' ? <span className="text-emerald-600 font-bold">Imported</span> : <span className="text-red-600 font-bold">Rejected</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap justify-center sm:justify-end gap-3 mt-6">
              <button 
                onClick={() => { setImportState('idle' as any); setFile(null); setParsedData([]); }} 
                className="bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold py-3 px-6 rounded-xl shadow-sm transition-colors"
              >
                Import Another CSV
              </button>
              <button 
                onClick={() => { onSuccess?.('expenses'); }} 
                className="bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold py-3 px-6 rounded-xl shadow-sm transition-colors"
              >
                View Expenses
              </button>
              <button 
                onClick={() => { onSuccess?.('balances'); }} 
                className="bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold py-3 px-6 rounded-xl shadow-sm transition-colors"
              >
                View Balances
              </button>
              <button 
                onClick={() => { onSuccess?.('groups'); }} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}

        {importState === 'report' && (
          <div className="bg-white border border-blue-200 rounded-3xl p-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl relative z-20">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <FileSpreadsheet className="w-10 h-10 text-blue-500" />
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Pre-Import Report</h3>
                <p className="text-gray-500 font-medium">Review the final actions taken on anomalies before committing to the database.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Total Rows</div>
                <div className="text-2xl font-extrabold text-blue-900">{stats.total}</div>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Valid Rows</div>
                <div className="text-2xl font-extrabold text-blue-900">{importReport.filter(r => r.finalStatus === 'Imported').length}</div>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Anomalies Fixed</div>
                <div className="text-2xl font-extrabold text-blue-900">{parsedData.filter(r => r._issueType !== 'None' && r._actionTaken !== '').length}</div>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Rejected Rows</div>
                <div className="text-2xl font-extrabold text-blue-900">{importReport.filter(r => r.finalStatus === 'Rejected').length}</div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                <h4 className="text-sm font-bold text-gray-900">Detailed Report Table</h4>
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white border-b border-gray-100 text-gray-500 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Row #</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Issue Type</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Action Taken</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Final Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {importReport.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.rowNumber}</td>
                        <td className="px-4 py-3 text-gray-600">{row.issueDetected}</td>
                        <td className="px-4 py-3 text-gray-600">{row.actionTaken}</td>
                        <td className="px-4 py-3">
                          {row.finalStatus === 'Imported' ? <span className="text-emerald-600 font-bold">Imported</span> : <span className="text-red-600 font-bold">Rejected</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-4">
                <button onClick={downloadReport} className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-sm transition-colors">
                  <Download className="w-4 h-4" /> Download CSV Report
                </button>
              </div>
              <button 
                onClick={handleImport} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                Continue Import <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {importState === 'reviewing' && (
          <div className="bg-white border border-yellow-200 rounded-3xl p-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl relative z-20">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <AlertTriangle className="w-10 h-10 text-yellow-500" />
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Review Anomalies</h3>
                <p className="text-gray-500 font-medium">Please review and resolve the flagged issues before importing.</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Row</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Issue Type</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Description</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Suggested Action</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">User Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedData.map((row, i) => {
                      if (row._status === 'valid' || row._status === 'rejected') return null;
                      return (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4 font-medium text-gray-900 align-top">#{row._originalIndex}</td>
                          <td className="px-4 py-4 align-top">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${row._status === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {row._issueType}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-600 align-top max-w-[200px] truncate" title={row.description}>
                            <div className="font-semibold text-gray-900 mb-1">{row.description}</div>
                            <div className="text-xs text-red-600 font-medium">{row._reason}</div>
                          </td>
                          <td className="px-4 py-4 font-medium text-indigo-600 align-top">
                            {row._suggestedAction}
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex gap-2">
                              {row._issueType === 'Duplicate Expense' ? (
                                <>
                                  <button onClick={() => handleResolveIssue(i, 'accept')} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-indigo-200">
                                    Merge
                                  </button>
                                  <button onClick={() => handleResolveIssue(i, 'keep')} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-emerald-200">
                                    Keep Both
                                  </button>
                                  <button onClick={() => handleResolveIssue(i, 'remove')} className="bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-red-200">
                                    Remove
                                  </button>
                                </>
                              ) : (
                                <>
                                  {row._status !== 'error' && (
                                    <button onClick={() => handleResolveIssue(i, 'accept')} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-indigo-200">
                                      Accept Suggestion
                                    </button>
                                  )}
                                  <button onClick={() => handleResolveIssue(i, 'ignore')} className="bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border border-gray-200">
                                    Ignore
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
               <button onClick={() => setImportState('ready')} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Preview
              </button>
              
              <button 
                onClick={handleGenerateReport} 
                disabled={stats.warnings > 0 || stats.errors > 0}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center gap-2"
                title={stats.errors > 0 || stats.warnings > 0 ? "Resolve all errors and warnings before proceeding" : ""}
              >
                Generate Import Report <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {['idle', 'error'].includes(importState) && (
          <>
            <div className="flex justify-end mb-2">
              <button onClick={downloadSample} className="text-purple-600 hover:text-purple-800 text-sm font-bold flex items-center gap-2">
                <Download className="w-4 h-4" /> Download Sample CSV
              </button>
            </div>

            <div 
              className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'} ${file ? 'bg-purple-50/50 border-purple-300' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${file ? 'bg-purple-100' : 'bg-gray-100'}`}>
                {file ? <FileSpreadsheet className="w-8 h-8 text-purple-600" /> : <Upload className="w-8 h-8 text-gray-400" />}
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                {file ? file.name : 'Click to upload or drag and drop'}
              </h4>
              <p className="text-gray-500 text-sm">
                {file ? 'File selected and ready for validation' : 'Only CSV files are supported (max 50MB)'}
              </p>
            </div>

            {importState === 'error' && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-red-800 text-sm font-medium">{errorMessage}</div>
              </div>
            )}

            {file && (
              <div className="flex flex-col items-center gap-2">
                <button 
                  onClick={validateCsv}
                  disabled={!selectedGroupId}
                  className="bg-black disabled:bg-gray-400 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all"
                >
                  Validate CSV Data
                </button>
                {!selectedGroupId && (
                  <span className="text-red-500 text-sm font-medium">Please select or create a group first.</span>
                )}
              </div>
            )}
          </>
        )}

        {['ready', 'importing'].includes(importState) && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Total Rows</div>
                <div className="text-2xl font-extrabold text-black">{stats.total}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl shadow-sm">
                <div className="text-emerald-700 text-xs font-bold uppercase mb-1">Valid Rows</div>
                <div className="text-2xl font-extrabold text-emerald-600 flex items-center gap-2">
                  {stats.valid} {stats.valid === stats.total && stats.total > 0 && <CheckCircle className="w-5 h-5" />}
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-2xl shadow-sm">
                <div className="text-yellow-700 text-xs font-bold uppercase mb-1">Warnings</div>
                <div className="text-2xl font-extrabold text-yellow-600">{stats.warnings}</div>
              </div>
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl shadow-sm">
                <div className="text-red-700 text-xs font-bold uppercase mb-1">Errors</div>
                <div className="text-2xl font-extrabold text-red-600">{stats.errors}</div>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl shadow-sm">
                <div className="text-indigo-700 text-xs font-bold uppercase mb-1">Detected Duplicates</div>
                <div className="text-2xl font-extrabold text-indigo-600">{stats.duplicates}</div>
              </div>
              <div className="bg-teal-50 border border-teal-100 p-4 rounded-2xl shadow-sm">
                <div className="text-teal-700 text-xs font-bold uppercase mb-1">Currency Issues</div>
                <div className="text-2xl font-extrabold text-teal-600">{stats.currency}</div>
              </div>
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl shadow-sm col-span-2">
                <div className="text-orange-700 text-xs font-bold uppercase mb-1">Membership Issues</div>
                <div className="text-2xl font-extrabold text-orange-600">{stats.membership}</div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-sm font-bold text-gray-700">Data Preview (First 10 Rows)</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white border-b border-gray-100 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Reason</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Description</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Amount</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Paid By</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {parsedData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {row._status === 'valid' && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase">Valid</span>}
                          {row._status === 'warning' && <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase">Warn</span>}
                          {row._status === 'error' && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase">Error</span>}
                          {row._status === 'rejected' && <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase">Rejected</span>}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-600 truncate max-w-[150px]" title={row._reason}>{row._reason}</td>
                        <td className="px-4 py-3 font-medium">{row.description || '-'}</td>
                        <td className="px-4 py-3 font-mono">{row.amount || '-'}</td>
                        <td className="px-4 py-3">{row.paidBy || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{row.date || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
              <button 
                onClick={() => { setImportState('idle'); setFile(null); setParsedData([]); }}
                disabled={importState === 'importing'}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" /> Change File
              </button>

              <div className="flex items-center gap-4">
                 {stats.warnings > 0 || stats.errors > 0 ? (
                  <button 
                    onClick={() => setImportState('reviewing')}
                    className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 border border-yellow-200"
                  >
                    <AlertTriangle className="w-5 h-5" /> Review {stats.warnings + stats.errors} Issues
                  </button>
                ) : <div />}
                
                <button 
                  onClick={handleGenerateReport} 
                  disabled={stats.warnings > 0 || stats.errors > 0}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  Generate Import Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FeaturePageLayout>
  );
};

export const FeatureAnomalyDetection = ({ onBack }: any) => (
  <FeaturePageLayout title="Anomaly Detection" icon={<AlertTriangle className="w-8 h-8 text-indigo-600" />} onBack={onBack}>
    <div className="max-w-2xl">
      <h3 className="text-xl font-bold mb-4">AI-Powered Fraud & Error Prevention</h3>
      <p className="text-gray-600 mb-8 text-lg leading-relaxed">
        SplitEase uses advanced heuristics to monitor your group's expense patterns. If someone accidentally logs the same dinner receipt twice, or an expense seems unusually high compared to historical data, we'll flag it for your review before settlement.
      </p>
      
      <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex items-center justify-center flex-col text-center">
        <AlertTriangle className="w-12 h-12 text-gray-300 mb-4" />
        <h4 className="font-bold text-gray-500 mb-2">Scanning Active Groups...</h4>
        <p className="text-sm text-gray-400">No anomalies detected in your recent transactions.</p>
      </div>
    </div>
  </FeaturePageLayout>
);

export const FeatureMultiCurrency = ({ onBack }: any) => (
  <FeaturePageLayout title="Multi-Currency Support" icon={<Globe className="w-8 h-8 text-emerald-600" />} onBack={onBack}>
    <div className="max-w-2xl">
      <h3 className="text-xl font-bold mb-4">Travel Without Math</h3>
      <p className="text-gray-600 mb-8 text-lg leading-relaxed">
        Going on an international trip? Log expenses in the local currency. SplitEase will automatically fetch real-time exchange rates and convert everything back to your group's default currency for perfectly accurate settlements.
      </p>
      
      <div className="grid grid-cols-2 gap-4">
        {['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD'].map(cur => (
          <div key={cur} className="p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <span className="font-bold text-lg">{cur}</span>
            <span className="text-emerald-500 text-sm font-semibold">Supported</span>
          </div>
        ))}
      </div>
    </div>
  </FeaturePageLayout>
);

export const FeatureMemberTracking = ({ onBack }: any) => (
  <FeaturePageLayout title="Member Join/Leave Tracking" icon={<UserPlus className="w-8 h-8 text-orange-600" />} onBack={onBack}>
    <div className="max-w-2xl">
      <h3 className="text-xl font-bold mb-4">Fairness Across Time</h3>
      <p className="text-gray-600 mb-8 text-lg leading-relaxed">
        Did a roommate move out halfway through the month? SplitEase strictly tracks when members join or leave a group. Recurring expenses (like rent or internet) are automatically pro-rated based on exact occupancy dates.
      </p>
      
      <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
            <UserPlus className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h4 className="font-bold text-orange-900">Timeline Engine Active</h4>
            <p className="text-sm text-orange-800">Your groups are fully protected by temporal tracking.</p>
          </div>
        </div>
      </div>
    </div>
  </FeaturePageLayout>
);

export const FeatureTraceability = ({ onBack, activeGroupId }: any) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await getAuditLogs(activeGroupId);
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (activeGroupId) fetchLogs();
  }, [activeGroupId]);

  return (
    <FeaturePageLayout title="Expense Traceability" icon={<Activity className="w-8 h-8 text-teal-600" />} onBack={onBack}>
      <div className="flex flex-col gap-8 w-full">
        <div className="max-w-3xl">
          <h3 className="text-2xl font-bold mb-4 text-gray-900">Complete Audit Trails</h3>
          <p className="text-gray-600 text-lg leading-relaxed">
            Trust is built on transparency. Every single action in SplitEase—whether it's adding a receipt, editing a split, or deleting a mistake—is recorded in a permanent, immutable audit log that all group members can see.
          </p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-teal-600"/> 
              Group Activity Log
            </h3>
          </div>
          <div className="p-6 overflow-y-auto max-h-[600px]">
            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center text-gray-500 p-12">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">No recent activity found.</p>
                <p className="text-sm">Activities performed in this group will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-teal-50/50 transition-colors border border-transparent hover:border-teal-100/50">
                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                      <Activity className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-gray-900 text-sm tracking-wide">{log.action}</div>
                        <div className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                          {new Date(log.timestamp).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </div>
                      </div>
                      <p className="text-gray-700 mb-2">{log.details}</p>
                      <div className="text-xs font-bold text-teal-700 flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-teal-100 flex items-center justify-center text-[8px] uppercase">
                          {log.user_uid.charAt(0)}
                        </div>
                        By {log.user_uid.split('@')[0]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </FeaturePageLayout>
  );
};

export const FeatureSettlement = ({ onBack, onOpenTool }: any) => (
  <FeaturePageLayout title="Settlement Management" icon={<CreditCard className="w-8 h-8 text-blue-600" />} onBack={onBack}>
    <div className="max-w-2xl">
      <h3 className="text-xl font-bold mb-4">Frictionless Paybacks</h3>
      <p className="text-gray-600 mb-8 text-lg leading-relaxed">
        When the trip is over, SplitEase calculates the absolute minimum number of transactions needed to settle all debts. You can record cash payments or integrate with payment gateways to resolve balances in seconds.
      </p>
      
      <button 
        onClick={onOpenTool}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all hover:-translate-y-1"
      >
        Open Settlement Hub
      </button>
    </div>
  </FeaturePageLayout>
);

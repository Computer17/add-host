import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  Language,
  PlatformSettings,
  WithdrawalRequest,
  TaskItem,
  ReferralRecord,
  AuditLogItem
} from '../types';
import { dataService } from '../lib/dataService';
import {
  ShieldAlert,
  Users,
  ArrowDownToLine,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Settings,
  Share2,
  FileText,
  Search,
  Lock,
  UserCheck,
  RefreshCw,
  Coins,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';

interface AdminDashboardProps {
  settings: PlatformSettings;
  language: Language;
  onSettingsUpdate: (settings: PlatformSettings) => void;
  onExit?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  settings,
  language,
  onSettingsUpdate,
  onExit,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'withdrawals' | 'users' | 'referrals' | 'roles' | 'tasks' | 'audit' | 'settings'>('overview');
  
  // Data states
  const [overview, setOverview] = useState<any>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [adminRoles, setAdminRoles] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Filters
  const [userSearch, setUserSearch] = useState('');

  // Modals / forms
  const [approveModalId, setApproveModalId] = useState<string | null>(null);
  const [trxInput, setTrxInput] = useState('');
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // User coin adjustment modal
  const [adjustTgId, setAdjustTgId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('');

  // Add new admin role
  const [newAdminIdInput, setNewAdminIdInput] = useState('');

  // New task form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTitleBn, setNewTaskTitleBn] = useState('');
  const [newTaskReward, setNewTaskReward] = useState(250);
  const [newTaskCategory, setNewTaskCategory] = useState('social');
  const [newTaskLink, setNewTaskLink] = useState('');

  // Settings form
  const [currentSettings, setCurrentSettings] = useState<PlatformSettings>(settings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    loadAllAdminData();
  }, [activeAdminTab]);

  const loadAllAdminData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [ov, w, r, a, logs, tData] = await Promise.all([
        dataService.getAdminOverview(),
        dataService.getAdminWithdrawals(),
        dataService.getAdminReferrals(),
        dataService.getAdminRoles(),
        dataService.getAdminAuditLogs(),
        dataService.getPublicData()
      ]);
      setOverview(ov);
      setWithdrawals(w);
      setReferrals(r);
      setAdminRoles(a);
      setAuditLogs(logs);
      setTasks(tData.tasks);

      if (activeAdminTab === 'users') {
        const u = await dataService.getAdminUsers(userSearch);
        setUsersList(u);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await dataService.getAdminUsers(userSearch);
      setUsersList(u);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveModalId) return;
    try {
      await dataService.approveWithdrawal(approveModalId, trxInput.trim() || undefined);
      setApproveModalId(null);
      setTrxInput('');
      await loadAllAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleReject = async () => {
    if (!rejectModalId) return;
    try {
      await dataService.rejectWithdrawal(rejectModalId, rejectReason.trim() || undefined);
      setRejectModalId(null);
      setRejectReason('');
      await loadAllAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleAdjustBalance = async () => {
    if (!adjustTgId) return;
    try {
      await dataService.adjustUserBalance(adjustTgId, adjustAmount, adjustReason);
      setAdjustTgId(null);
      setAdjustAmount(100);
      setAdjustReason('');
      await loadAllAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminIdInput.trim()) return;
    try {
      const updated = await dataService.addAdminRole(newAdminIdInput.trim());
      setAdminRoles(updated);
      setNewAdminIdInput('');
      await loadAllAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRemoveAdmin = async (id: string) => {
    if (!confirm(`Are you sure you want to remove Telegram ID ${id} from Admin Roles?`)) return;
    try {
      const updated = await dataService.removeAdminRole(id);
      setAdminRoles(updated);
      await loadAllAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await dataService.addAdminTask({
        title: newTaskTitle.trim(),
        title_bn: newTaskTitleBn.trim() || newTaskTitle.trim(),
        reward: Number(newTaskReward),
        category: newTaskCategory,
        link: newTaskLink.trim() || undefined
      });
      setNewTaskTitle('');
      setNewTaskTitleBn('');
      setNewTaskLink('');
      await loadAllAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await dataService.deleteAdminTask(taskId);
      await loadAllAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await dataService.updateAdminSettings(currentSettings);
      setCurrentSettings(updated);
      onSettingsUpdate(updated);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const pendingWdCount = withdrawals.filter(w => w.status === 'pending').length;

  return (
    <div className="space-y-4 pb-24">
      {/* Admin Title Card */}
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Telegram ID-Based Admin Panel</h2>
              <p className="text-[11px] text-slate-400">Strict Server-Side Protected Control Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAllAdminData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onExit && (
              <button
                onClick={onExit}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                title="Return to User View"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Exit Admin</span>
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Admin Navigation Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800 text-xs">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'withdrawals', label: `Withdrawals (${pendingWdCount})` },
          { id: 'users', label: 'Users' },
          { id: 'referrals', label: `Referrals (${referrals.length})` },
          { id: 'roles', label: `Admin Roles (${adminRoles.length})` },
          { id: 'tasks', label: 'Tasks' },
          { id: 'audit', label: 'Audit Logs' },
          { id: 'settings', label: 'Settings' },
        ].map((tab) => {
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeAdminTab === 'overview' && overview && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-xs text-slate-400">Total Users</span>
              <p className="text-2xl font-black text-slate-100 mt-1">{overview.totalUsers}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-xs text-slate-400">Coins in Circulation</span>
              <p className="text-2xl font-black text-amber-400 mt-1">{overview.totalCoins.toLocaleString()} YZ</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-xs text-slate-400">Pending Withdrawals</span>
              <p className="text-2xl font-black text-amber-500 mt-1">{overview.pendingWithdrawalsCount}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-xs text-slate-400">Total Paid Out</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">৳{overview.totalPaidBdt} BDT</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Authorized Admin Telegram IDs</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {adminRoles.map((id) => (
                <span key={id} className="font-mono text-xs bg-slate-950 border border-indigo-500/40 text-indigo-300 px-2.5 py-1 rounded-lg font-bold">
                  ID: {id}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAWALS TAB */}
      {activeAdminTab === 'withdrawals' && (
        <div className="space-y-3">
          {withdrawals.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400">
              No withdrawal requests recorded yet.
            </div>
          ) : (
            withdrawals.map((w) => (
              <div key={w.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {w.method}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100">{w.user_name}</h4>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 font-mono">
                      {w.account_number} ({w.account_type || 'personal'})
                    </p>
                    <p className="text-[10px] text-slate-500">Telegram ID: {w.telegram_id}</p>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    w.status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : w.status === 'rejected'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {w.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <div>
                    <span className="font-bold text-amber-400">{w.amount_coins.toLocaleString()} YZ</span>
                    <span className="text-emerald-400 font-bold ml-2">৳{w.amount_bdt} BDT</span>
                  </div>

                  {w.status === 'pending' ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setApproveModalId(w.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectModalId(w.id)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {w.transaction_id ? `Trx: ${w.transaction_id}` : w.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* USERS TAB */}
      {activeAdminTab === 'users' && (
        <div className="space-y-3">
          <form onSubmit={handleSearchUsers} className="flex gap-2">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by Telegram ID, Username, Name..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Search
            </button>
          </form>

          <div className="space-y-2">
            {usersList.map((u) => (
              <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-100">{u.first_name} {u.last_name || ''}</span>
                    <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                      ID: {u.telegram_id}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">@{u.username} | Referrals: {u.referral_count || 0}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400">{u.coins.toLocaleString()} YZ</span>
                    <p className="text-[10px] text-slate-500">Lv.{u.level}</p>
                  </div>
                  <button
                    onClick={() => {
                      setAdjustTgId(u.telegram_id);
                      setAdjustAmount(100);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400"
                    title="Adjust Coins"
                  >
                    <Coins className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REFERRALS TAB */}
      {activeAdminTab === 'referrals' && (
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-slate-200 mb-1">Telegram Referral Verification History</h3>
            <p className="text-[11px] text-slate-400">Total Valid Referrals Recorded: {referrals.length}</p>
          </div>

          <div className="space-y-2">
            {referrals.map((ref) => (
              <div key={ref.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">
                    Referrer: <strong className="text-slate-100 font-mono">{ref.referrer_id}</strong> ({ref.referrer_name || 'User'})
                  </span>
                  <span className="text-emerald-400 font-bold">+{ref.bonus_coins} YZ</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>
                    Referred: <strong className="text-slate-200 font-mono">{ref.referred_id}</strong> ({ref.referred_name || 'New'})
                  </span>
                  <span className="text-slate-500">{new Date(ref.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN ROLES TAB */}
      {activeAdminTab === 'roles' && (
        <div className="space-y-4">
          <form onSubmit={handleAddAdmin} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Grant Admin Role by Telegram Numeric User ID</span>
            </h3>

            <p className="text-[11px] text-slate-400 leading-snug">
              Security Notice: Only authorized Admin Telegram IDs can access the Admin Panel. Usernames or URL parameters are rejected.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Telegram Numeric User ID (e.g. 6919025708)"
                value={newAdminIdInput}
                onChange={(e) => setNewAdminIdInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
              >
                Add Admin ID
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {adminRoles.map((id) => (
              <div key={id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-xs font-bold text-slate-100">{id}</span>
                </div>
                {adminRoles.length > 1 && (
                  <button
                    onClick={() => handleRemoveAdmin(id)}
                    className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs"
                    title="Revoke Admin Role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TASKS TAB */}
      {activeAdminTab === 'tasks' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateTask} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200">Create New Earning Task</h3>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Title (English)"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                required
              />
              <input
                type="text"
                placeholder="Title (বাংলা)"
                value={newTaskTitleBn}
                onChange={(e) => setNewTaskTitleBn(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Reward YZ"
                value={newTaskReward}
                onChange={(e) => setNewTaskReward(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
              />
              <select
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
              >
                <option value="social">Social Media</option>
                <option value="channel">Telegram Channel</option>
                <option value="daily">Daily Mission</option>
              </select>
            </div>
            <input
              type="url"
              placeholder="Target Link (https://...)"
              value={newTaskLink}
              onChange={(e) => setNewTaskLink(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
            >
              Add Task
            </button>
          </form>

          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{t.title}</h4>
                  <p className="text-[11px] text-amber-400 font-semibold">+{t.reward} YZ | {t.category}</p>
                </div>
                <button
                  onClick={() => handleDeleteTask(t.id)}
                  className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AUDIT LOGS TAB */}
      {activeAdminTab === 'audit' && (
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Server-Side Security Audit Logs</span>
            </h3>
            <p className="text-[11px] text-slate-400">All administrative actions and security events are logged with Telegram IDs.</p>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className={`font-mono font-bold ${log.success ? 'text-indigo-400' : 'text-rose-400'}`}>
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">{log.details}</p>
                <div className="text-[10px] text-slate-500 font-mono">
                  By Admin ID: {log.admin_id}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeAdminTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-200">Global Configuration</h3>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Coin to BDT Rate (e.g. 0.01)</label>
            <input
              type="number"
              step="0.001"
              value={currentSettings.coin_to_bdt_rate}
              onChange={(e) => setCurrentSettings({ ...currentSettings, coin_to_bdt_rate: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Referral Bonus (Coins)</label>
            <input
              type="number"
              value={currentSettings.referral_bonus}
              onChange={(e) => setCurrentSettings({ ...currentSettings, referral_bonus: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Minimum Withdrawal (Coins)</label>
            <input
              type="number"
              value={currentSettings.min_withdrawal_coins}
              onChange={(e) => setCurrentSettings({ ...currentSettings, min_withdrawal_coins: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
          </div>

          {settingsSaved && (
            <p className="text-xs text-emerald-400 font-bold">Settings saved successfully!</p>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
          >
            Save Settings
          </button>
        </form>
      )}

      {/* APPROVE MODAL */}
      {approveModalId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-3">
            <h3 className="text-sm font-bold text-slate-100">Approve Withdrawal</h3>
            <p className="text-xs text-slate-400">Provide payment transaction ID (optional):</p>
            <input
              type="text"
              placeholder="e.g. BK98234729"
              value={trxInput}
              onChange={(e) => setTrxInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setApproveModalId(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-3">
            <h3 className="text-sm font-bold text-slate-100">Reject Withdrawal</h3>
            <p className="text-xs text-slate-400">Reason for rejection (coins will be refunded):</p>
            <input
              type="text"
              placeholder="e.g. Account number invalid"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectModalId(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
              >
                Reject & Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADJUST COINS MODAL */}
      {adjustTgId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-3">
            <h3 className="text-sm font-bold text-slate-100">Adjust Coins (ID: {adjustTgId})</h3>
            <input
              type="number"
              placeholder="Amount (e.g. 500 or -200)"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
            <input
              type="text"
              placeholder="Reason for adjustment"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAdjustTgId(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustBalance}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

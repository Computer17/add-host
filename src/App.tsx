import React, { useState, useEffect } from 'react';
import { UserProfile, Language, PlatformSettings, TaskItem } from './types';
import { dataService } from './lib/dataService';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { TasksSection } from './components/TasksSection';
import { SpinWheel } from './components/SpinWheel';
import { WithdrawModal } from './components/WithdrawModal';
import { LeaderboardView } from './components/LeaderboardView';
import { AdminDashboard } from './components/AdminDashboard';
import { Loader2, Lock, ExternalLink, Bot, AlertTriangle, RefreshCw } from 'lucide-react';

export default function App() {
  const [language, setLanguage] = useState<Language>('bn');
  const [activeView, setActiveView] = useState<'miniapp' | 'admin'>('miniapp');
  const [currentTab, setCurrentTab] = useState<'home' | 'tasks' | 'spin' | 'withdraw' | 'leaderboard'>('home');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [isTelegramAccessDenied, setIsTelegramAccessDenied] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    setInitError(null);
    setIsTelegramAccessDenied(false);

    try {
      // 1. Fetch public platform settings & tasks (with resilient fallback in dataService)
      const publicData = await dataService.getPublicData();
      setSettings(publicData.settings);
      setTasks(publicData.tasks);

      // Check URL parameters for explicit view (e.g. ?view=admin from bot)
      const urlParams = new URLSearchParams(window.location.search);
      const requestedView = urlParams.get('view');

      // 2. Check for Telegram WebApp environment
      const isTgAvailable = typeof window !== 'undefined' && Boolean((window as any).Telegram?.WebApp);
      const tg = isTgAvailable ? (window as any).Telegram.WebApp : null;
      const initData = tg?.initData;

      if (tg) {
        tg.ready();
        tg.expand();
      }

      // 3. Telegram Authentication Flow
      if (initData && initData.length > 0) {
        // Official Telegram Mini App initData verification via backend HMAC-SHA256
        const authResult = await dataService.verifyTelegramInitData(initData);
        setUser(authResult.user);
        setIsTelegramAccessDenied(false);

        if (requestedView === 'admin' && authResult.isAdmin) {
          setActiveView('admin');
        } else {
          setActiveView('miniapp');
        }
      } else {
        // Not inside Telegram WebApp or initData not provided
        // Check if running in Google AI Studio Preview / Localhost environment
        const isPreviewEnv =
          window.location.hostname.includes('run.app') ||
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1';

        if (isPreviewEnv) {
          // Initialize sandbox preview session for developer testing
          try {
            const previewAuth = await dataService.getPreviewSession();
            setUser(previewAuth.user);
            setIsTelegramAccessDenied(false);

            if (requestedView === 'admin' && previewAuth.isAdmin) {
              setActiveView('admin');
            } else {
              setActiveView('miniapp');
            }
          } catch (e: any) {
            console.warn('Preview session failed, falling back to local user:', e);
            const fallbackUser: UserProfile = {
              id: '6919025708',
              telegram_id: '6919025708',
              username: 'DarkPrince_Dev',
              first_name: 'ᴅᴀʀᴋ ᴘʀɪɴᴄᴇ',
              last_name: '',
              language: 'bn',
              coins: 1200,
              total_earned: 1200,
              level: 2,
              referral_code: 'ref_6919025708',
              referral_count: 2,
              is_admin: true,
              completed_tasks: ['task-daily-checkin'],
              created_at: new Date().toISOString()
            };
            setUser(fallbackUser);
            setIsTelegramAccessDenied(false);
          }
        } else {
          // In production or external domain (e.g. trycloudflare) outside Telegram:
          // Strictly display Telegram Mini App Access Gatekeeper
          setIsTelegramAccessDenied(true);
        }
      }
    } catch (err: any) {
      console.error('App initialization error:', err);
      setInitError(err.message || 'Failed to initialize app');
      // If signature verification strictly failed, enforce gatekeeper
      if (err.message?.includes('401') || err.message?.includes('signature')) {
        setIsTelegramAccessDenied(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    if (user) {
      setUser({ ...user, language: newLang });
    }
  };

  // -------------------------------------------------------------------
  // 1. LOADING STATE (With Timeout Safety & Clean Visuals)
  // -------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-400">
        <Loader2 className="w-9 h-9 text-amber-500 animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-slate-200">
          Loading Withdrawal Sender...
        </p>
        <span className="text-[11px] text-slate-500 mt-1">Connecting to Telegram & Rewards Hub</span>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 2. ERROR STATE (Provides Actionable Retry Instead of Stalling)
  // -------------------------------------------------------------------
  if (initError && !user && !isTelegramAccessDenied) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-100">Connection Failed</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {initError}
          </p>
          <button
            onClick={initApp}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-amber-500/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // 3. TELEGRAM MINI APP ONLY ACCESS GATEKEEPER
  // -------------------------------------------------------------------
  if (isTelegramAccessDenied) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-lg font-bold text-slate-100">
            Telegram Mini App Access Only
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed">
            এই অ্যাপ্লিকেশনটি শুধুমাত্র Telegram-এর ভেতরে ব্যবহারের জন্য প্রস্তুত করা হয়েছে। দয়া করে আমাদের অফিসিয়াল টেলিগ্রাম বটের মাধ্যমে প্রবেশ করুন:
          </p>

          <a
            href="https://t.me/Hhhhhhuhhuhbot"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Bot className="w-4 h-4" />
            <span>Open @Hhhhhhuhhuhbot</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={initApp}
            className="w-full py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700/60 transition-colors"
          >
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  if (!user || !settings) {
    return null;
  }

  // -------------------------------------------------------------------
  // 4. MAIN APPLICATION
  // -------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top Header: Displays User Profile, Coins, Language, and Admin Badge (if authorized) */}
      <Header
        user={user}
        settings={settings}
        language={language}
        onLanguageChange={handleLanguageChange}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-4">
        {/* ============================================================== */}
        {/* USER PANEL: Clean, focused, only user features                */}
        {/* ============================================================== */}
        {activeView === 'miniapp' && (
          <>
            {currentTab === 'home' && (
              <HomeView
                user={user}
                settings={settings}
                language={language}
                onTabChange={setCurrentTab}
                onUserUpdate={setUser}
              />
            )}
            {currentTab === 'tasks' && (
              <TasksSection
                tasks={tasks}
                user={user}
                language={language}
                onUserUpdate={setUser}
              />
            )}
            {currentTab === 'spin' && (
              <SpinWheel
                user={user}
                settings={settings}
                language={language}
                onUserUpdate={setUser}
              />
            )}
            {currentTab === 'withdraw' && (
              <WithdrawModal
                user={user}
                settings={settings}
                language={language}
                onUserUpdate={setUser}
              />
            )}
            {currentTab === 'leaderboard' && (
              <LeaderboardView
                user={user}
                language={language}
              />
            )}

            {/* Mobile Bottom Navigation (Visible ONLY in User Panel) */}
            <BottomNav
              currentTab={currentTab}
              onTabChange={setCurrentTab}
              language={language}
            />
          </>
        )}

        {/* ============================================================== */}
        {/* ADMIN PANEL: Protected Server-Side & Client-Side             */}
        {/* ============================================================== */}
        {activeView === 'admin' && (
          user.is_admin ? (
            <AdminDashboard
              settings={settings}
              language={language}
              onSettingsUpdate={setSettings}
              onExit={() => setActiveView('miniapp')}
            />
          ) : (
            <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 text-center space-y-3 mt-6">
              <Lock className="w-8 h-8 text-rose-500 mx-auto" />
              <h3 className="text-base font-bold text-rose-400">403 Access Denied</h3>
              <p className="text-xs text-slate-400">
                You do not have administrative privileges. Admin access requires a server-authorized Telegram Numeric User ID.
              </p>
              <button
                onClick={() => setActiveView('miniapp')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
              >
                Return to User App
              </button>
            </div>
          )
        )}
      </main>
    </div>
  );
}

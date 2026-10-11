import React from 'react';
import { UserProfile, Language, PlatformSettings } from '../types';
import { getTranslation } from '../lib/i18n';
import { Coins, ShieldAlert, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  user: UserProfile;
  settings: PlatformSettings;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  activeView: 'miniapp' | 'admin';
  onViewChange: (view: 'miniapp' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  settings,
  language,
  onLanguageChange,
  activeView,
  onViewChange,
}) => {
  const t = getTranslation(language);
  const bdtValue = (user.coins * settings.coin_to_bdt_rate).toFixed(2);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        {/* User Info / Brand */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 p-0.5 shadow-md shadow-amber-500/20">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-amber-400 font-bold text-sm">
                {(user.first_name || 'U').slice(0, 1).toUpperCase()}
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-100 max-w-[120px] truncate">
                {user.first_name || 'User'}
              </span>
              <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                Lv.{user.level || 1}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[130px]">
              @{user.username || `user_${user.telegram_id}`}
            </p>
          </div>
        </div>

        {/* Right side: Coins + Authorized Admin Switcher + Language Switcher */}
        <div className="flex items-center gap-2">
          {/* Coin Badge */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/5 border border-amber-500/30 px-3 py-1.5 rounded-xl shadow-inner">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            </div>
            <div className="flex flex-col items-end">
              <span className="font-extrabold text-xs text-amber-300 leading-tight">
                {(user.coins || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-400 leading-tight font-medium">
                ≈ {t.bdtSymbol}{bdtValue}
              </span>
            </div>
          </div>

          {/* Admin Entrypoint: Displayed ONLY for verified server-authorized admins */}
          {user.is_admin && (
            <button
              onClick={() => onViewChange(activeView === 'admin' ? 'miniapp' : 'admin')}
              className={`px-2 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                activeView === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25'
              }`}
              title={activeView === 'admin' ? 'Exit Admin Mode' : 'Open Admin Panel'}
            >
              {activeView === 'admin' ? (
                <>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Exit</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Admin</span>
                </>
              )}
            </button>
          )}

          {/* Language Switcher */}
          <button
            onClick={() => onLanguageChange(language === 'en' ? 'bn' : 'en')}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-xs font-bold transition-colors text-slate-200"
            title="Switch Language"
          >
            {language === 'en' ? 'বাং' : 'EN'}
          </button>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { Home, CheckSquare, Disc3, ArrowDownToLine, Trophy } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../lib/i18n';

interface BottomNavProps {
  currentTab: 'home' | 'tasks' | 'spin' | 'withdraw' | 'leaderboard';
  onTabChange: (tab: 'home' | 'tasks' | 'spin' | 'withdraw' | 'leaderboard') => void;
  language: Language;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, language }) => {
  const t = getTranslation(language);

  interface NavItem {
    id: 'home' | 'tasks' | 'spin' | 'withdraw' | 'leaderboard';
    label: string;
    icon: React.ElementType;
    highlight?: boolean;
  }

  const navItems: NavItem[] = [
    { id: 'home', label: t.tabs.home, icon: Home },
    { id: 'tasks', label: t.tabs.tasks, icon: CheckSquare },
    { id: 'spin', label: t.tabs.spin, icon: Disc3, highlight: true },
    { id: 'withdraw', label: t.tabs.withdraw, icon: ArrowDownToLine },
    { id: 'leaderboard', label: t.tabs.leaderboard, icon: Trophy },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe">
      <div className="max-w-md mx-auto px-2 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          if (item.highlight) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative -top-4 flex flex-col items-center group focus:outline-none"
              >
                <div
                  className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-transform transform active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-amber-500/40 ring-4 ring-slate-950'
                      : 'bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-900 shadow-amber-500/20 ring-4 ring-slate-950 hover:brightness-110'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'animate-spin-slow' : ''}`} />
                </div>
                <span
                  className={`text-[10px] font-bold mt-1 ${
                    isActive ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex-1 py-1 flex flex-col items-center gap-1 transition-colors relative ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full absolute -top-1" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

import React, { useEffect, useState } from 'react';
import { LeaderboardEntry, UserProfile, Language } from '../types';
import { getTranslation } from '../lib/i18n';
import { dataService } from '../lib/dataService';
import { Trophy, Medal, Crown, Flame, Award } from 'lucide-react';

interface LeaderboardViewProps {
  user: UserProfile;
  language: Language;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ user, language }) => {
  const t = getTranslation(language);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    dataService.getLeaderboard().then(setLeaders);
  }, []);

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="space-y-4 pb-20">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-amber-500/15 border border-amber-500/30 rounded-2xl p-4 text-center">
        <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold mb-2">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.leaderboard.title}</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-100">
          {language === 'en' ? 'Hall of Champions' : 'সেরা চ্যাম্পিয়নদের তালিকা'}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{t.leaderboard.subtitle}</p>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-3 gap-2 items-end pt-4 pb-2">
        {/* 2nd Place */}
        {top3[1] && (
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-2.5 text-center flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-900 font-extrabold text-xs flex items-center justify-center mb-1.5 shadow-md">
              2
            </div>
            <span className="text-xs font-bold text-slate-100 truncate w-full">
              {top3[1].name}
            </span>
            <span className="text-[10px] text-slate-400 truncate w-full">{top3[1].username}</span>
            <div className="text-[11px] font-extrabold text-amber-300 mt-1">
              {top3[1].total_earned.toLocaleString()}
            </div>
          </div>
        )}

        {/* 1st Place (Crown) */}
        {top3[0] && (
          <div className="bg-gradient-to-b from-amber-500/20 to-slate-900 border-2 border-amber-400 rounded-2xl p-3 text-center flex flex-col items-center shadow-lg shadow-amber-500/20 -translate-y-2">
            <div className="w-6 h-6 -mt-5 mb-1 text-amber-400">
              <Crown className="w-6 h-6 animate-bounce" />
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-sm flex items-center justify-center mb-1.5 shadow-md">
              1
            </div>
            <span className="text-xs font-extrabold text-amber-300 truncate w-full">
              {top3[0].name}
            </span>
            <span className="text-[10px] text-slate-400 truncate w-full">{top3[0].username}</span>
            <div className="text-xs font-black text-amber-400 mt-1">
              {top3[0].total_earned.toLocaleString()} YZ
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <div className="bg-slate-900 border border-amber-900/60 rounded-2xl p-2.5 text-center flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-amber-700 text-slate-100 font-extrabold text-xs flex items-center justify-center mb-1.5 shadow-md">
              3
            </div>
            <span className="text-xs font-bold text-slate-100 truncate w-full">
              {top3[2].name}
            </span>
            <span className="text-[10px] text-slate-400 truncate w-full">{top3[2].username}</span>
            <div className="text-[11px] font-extrabold text-amber-300 mt-1">
              {top3[2].total_earned.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Rest of the Leaderboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
        {rest.map((entry) => (
          <div key={entry.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center gap-3">
              <span className="w-6 text-center font-bold text-xs text-slate-500">
                #{entry.rank}
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-200">{entry.name}</h4>
                <p className="text-[10px] text-slate-400">{entry.username}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-extrabold text-amber-400">
                {entry.total_earned.toLocaleString()} YZ
              </span>
              <p className="text-[10px] text-slate-500">Lv.{entry.level}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

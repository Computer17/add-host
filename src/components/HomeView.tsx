import React, { useState } from 'react';
import { UserProfile, Language, PlatformSettings } from '../types';
import { getTranslation } from '../lib/i18n';
import { dataService } from '../lib/dataService';
import {
  Sparkles,
  Share2,
  Copy,
  Check,
  Disc3,
  CheckSquare,
  ArrowDownToLine,
  Ticket,
  Users,
  Flame,
  Gift,
  ExternalLink,
  Coins
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface HomeViewProps {
  user: UserProfile;
  settings: PlatformSettings;
  language: Language;
  onTabChange: (tab: 'home' | 'tasks' | 'spin' | 'withdraw' | 'leaderboard') => void;
  onUserUpdate: (user: UserProfile) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  settings,
  language,
  onTabChange,
  onUserUpdate,
}) => {
  const t = getTranslation(language);
  const [copied, setCopied] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isClaimingBonus, setIsClaimingBonus] = useState(false);

  const botName = dataService.getBotUsername();
  const referralLink = `https://t.me/${botName}?start=ref_${user.telegram_id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(
      `🎁 Join ${settings.bot_name} to earn coins and cash out to bKash/Nagad! Join via my link:\n${referralLink}`
    );
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`;
    const tg = typeof window !== 'undefined' && (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.location.href = shareUrl;
    }
  };

  const handleClaimDailyCheckin = async () => {
    if (user.completed_tasks.includes('daily_checkin_today') || isClaimingBonus) return;

    setIsClaimingBonus(true);
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 }
    });

    const updatedUser: UserProfile = {
      ...user,
      coins: user.coins + 100,
      total_earned: user.total_earned + 100,
      completed_tasks: [...user.completed_tasks, 'daily_checkin_today']
    };

    onUserUpdate(updatedUser);
    setIsClaimingBonus(false);
  };

  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;

    try {
      const res = await dataService.redeemPromoCode(promoInput.trim());
      if (res.success) {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.7 }
        });
        const updatedUser: UserProfile = {
          ...user,
          coins: res.coins,
          total_earned: user.total_earned + res.reward_coins
        };
        onUserUpdate(updatedUser);
        setPromoMessage({ type: 'success', text: t.home.codeApplied });
        setPromoInput('');
      }
    } catch (err: any) {
      setPromoMessage({ type: 'error', text: err.message || t.home.codeInvalid });
    }
    setTimeout(() => setPromoMessage(null), 3500);
  };

  const isDailyClaimed = user.completed_tasks.includes('daily_checkin_today');

  return (
    <div className="space-y-4 pb-20">
      {/* Announcement banner */}
      {settings.announcement && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-200/90 leading-snug line-clamp-2">
            {settings.announcement}
          </p>
        </div>
      )}

      {/* Main Balance Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 via-orange-600/15 to-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-lg shadow-amber-500/10">
        <div className="relative z-10 flex flex-col items-center text-center">
          <span className="text-xs font-semibold text-slate-300 mb-1">
            {t.balance}
          </span>
          <div className="flex items-center gap-2">
            <Coins className="w-7 h-7 text-amber-400 animate-bounce" />
            <span className="text-3xl font-black text-amber-300 tracking-tight">
              {user.coins.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-amber-400/80 uppercase">
              YZ
            </span>
          </div>

          <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
            <span className="text-[11px] font-bold text-emerald-400">
              ≈ {t.bdtSymbol}{(user.coins * settings.coin_to_bdt_rate).toFixed(2)} BDT
            </span>
          </div>

          {/* Quick Buttons Row */}
          <div className="grid grid-cols-3 gap-2 w-full mt-5">
            <button
              onClick={() => onTabChange('spin')}
              className="py-2.5 px-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 flex flex-col items-center gap-1 text-xs font-bold text-slate-200 transition-all hover:scale-102"
            >
              <Disc3 className="w-4 h-4 text-amber-400" />
              <span>{t.home.spinWheel}</span>
            </button>
            <button
              onClick={() => onTabChange('tasks')}
              className="py-2.5 px-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 flex flex-col items-center gap-1 text-xs font-bold text-slate-200 transition-all hover:scale-102"
            >
              <CheckSquare className="w-4 h-4 text-sky-400" />
              <span>{t.home.earnMore}</span>
            </button>
            <button
              onClick={() => onTabChange('withdraw')}
              className="py-2.5 px-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 flex flex-col items-center gap-1 text-xs font-bold text-slate-200 transition-all hover:scale-102"
            >
              <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
              <span>{t.home.cashOut}</span>
            </button>
          </div>
        </div>

        {/* Background glow circle */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Daily Check-in Streak Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">{t.home.dailyBonus}</h4>
            <p className="text-[11px] text-slate-400">+100 YZ Coins every 24h</p>
          </div>
        </div>

        <button
          onClick={handleClaimDailyCheckin}
          disabled={isDailyClaimed || isClaimingBonus}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isDailyClaimed
              ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-default'
              : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95'
          }`}
        >
          {isDailyClaimed ? t.home.claimedToday : t.home.claimBonus}
        </button>
      </div>

      {/* Referral System Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold text-slate-200">{t.home.inviteFriends}</h4>
          </div>
          <span className="text-[10px] bg-sky-500/20 text-sky-300 font-semibold px-2 py-0.5 rounded-full border border-sky-500/30">
            +{settings.referral_bonus} YZ / Friend
          </span>
        </div>

        <p className="text-xs text-slate-400">{t.home.inviteDesc}</p>

        {/* Copyable link input */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono truncate">
            {referralLink}
          </div>
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors shrink-0"
            title="Copy link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleShareTelegram}
            className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition-colors shrink-0 shadow-md shadow-sky-500/20"
            title="Share directly in Telegram"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[11px] text-slate-400">
          <span>{t.home.totalInvited}:</span>
          <span className="font-bold text-amber-400">{user.referral_count} friends</span>
        </div>
      </div>

      {/* Promo Code Redemption */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Ticket className="w-4 h-4 text-amber-400" />
          <span>{t.home.redeemCode}</span>
        </div>

        <form onSubmit={handleRedeemPromo} className="flex gap-2">
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            placeholder="e.g. WELCOME100, BONUS500"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 uppercase transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors shrink-0"
          >
            {t.home.apply}
          </button>
        </form>

        {promoMessage && (
          <p
            className={`text-[11px] font-medium ${
              promoMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {promoMessage.text}
          </p>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { UserProfile, Language, PlatformSettings } from '../types';
import { getTranslation } from '../lib/i18n';
import { dataService } from '../lib/dataService';
import { Sparkles, Coins, Disc3, Trophy, Flame } from 'lucide-react';

interface SpinWheelProps {
  user: UserProfile;
  settings: PlatformSettings;
  language: Language;
  onUserUpdate: (user: UserProfile) => void;
}

const SEGMENTS = [
  { reward: 100, label: '100 YZ', color: '#f59e0b', textColor: '#000000' },
  { reward: 50, label: '50 YZ', color: '#3b82f6', textColor: '#ffffff' },
  { reward: 500, label: '500 YZ', color: '#ec4899', textColor: '#ffffff' },
  { reward: 200, label: '200 YZ', color: '#10b981', textColor: '#ffffff' },
  { reward: 1000, label: '1000 YZ', color: '#8b5cf6', textColor: '#ffffff' },
  { reward: 75, label: '75 YZ', color: '#f97316', textColor: '#ffffff' },
  { reward: 300, label: '300 YZ', color: '#06b6d4', textColor: '#ffffff' },
  { reward: 250, label: '250 YZ', color: '#eab308', textColor: '#000000' },
];

export const SpinWheel: React.FC<SpinWheelProps> = ({
  user,
  settings,
  language,
  onUserUpdate,
}) => {
  const t = getTranslation(language);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winMessage, setWinMessage] = useState<number | null>(null);

  const numSegments = SEGMENTS.length;
  const segmentAngle = 360 / numSegments;

  const handleSpin = async () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setWinMessage(null);

    // Pick random segment
    const winningIndex = Math.floor(Math.random() * numSegments);
    const selectedReward = SEGMENTS[winningIndex].reward;

    // Calculate rotation: 5 full rotations + angle to align pointer at top (270 deg)
    const extraRotations = 360 * 6;
    const targetAngle = 360 - (winningIndex * segmentAngle + segmentAngle / 2);
    const newRotation = rotation + extraRotations + (targetAngle - (rotation % 360));

    setRotation(newRotation);

    setTimeout(async () => {
      setIsSpinning(false);
      setWinMessage(selectedReward);

      // Trigger Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899']
      });

      try {
        const res = await dataService.spinWheel(selectedReward);
        const updatedUser: UserProfile = {
          ...user,
          coins: res.coins,
          total_earned: res.total_earned,
          last_spin_time: Date.now()
        };
        onUserUpdate(updatedUser);
      } catch (e) {
        console.warn('Spin api warning:', e);
        const updatedUser: UserProfile = {
          ...user,
          coins: user.coins + selectedReward,
          total_earned: user.total_earned + selectedReward,
          last_spin_time: Date.now()
        };
        onUserUpdate(updatedUser);
      }
    }, 4000);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Title Card */}
      <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 rounded-2xl p-4 text-center">
        <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold mb-2">
          <Disc3 className="w-3.5 h-3.5 animate-spin" />
          <span>{t.spin.title}</span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-100">
          {language === 'en' ? 'Spin & Win Rewards!' : 'ঘোরান এবং পুরস্কার জিতুন!'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">{t.spin.subtitle}</p>
      </div>

      {/* Wheel Container */}
      <div className="relative flex flex-col items-center justify-center py-4">
        {/* Pointer indicator */}
        <div className="absolute top-2 z-20 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-amber-400 drop-shadow-[0_4px_6px_rgba(245,158,11,0.5)]" />

        {/* Wheel circle */}
        <div className="relative w-72 h-72 rounded-full border-4 border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.25)] overflow-hidden bg-slate-900">
          <div
            className="w-full h-full rounded-full transition-transform ease-out duration-[4000ms]"
            style={{
              transform: `rotate(${rotation}deg)`,
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {SEGMENTS.map((seg, i) => {
                const startAngle = (i * 360) / numSegments;
                const endAngle = ((i + 1) * 360) / numSegments;
                const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);
                const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

                const textAngle = startAngle + segmentAngle / 2;
                const textX = 50 + 32 * Math.cos((Math.PI * textAngle) / 180);
                const textY = 50 + 32 * Math.sin((Math.PI * textAngle) / 180);

                return (
                  <g key={i}>
                    <path d={pathData} fill={seg.color} stroke="#0f172a" strokeWidth="0.8" />
                    <text
                      x={textX}
                      y={textY}
                      fill={seg.textColor}
                      fontSize="5"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                    >
                      {seg.reward}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Center Pin Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/50 flex flex-col items-center justify-center border-2 border-slate-950 active:scale-95 disabled:opacity-80 disabled:cursor-not-allowed hover:brightness-110 transition-transform"
            >
              <Coins className="w-4 h-4 text-slate-950 mb-0.5" />
              <span>{isSpinning ? '...' : 'SPIN'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Win Modal / Announcement */}
      {winMessage !== null && (
        <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-500/40 rounded-2xl p-4 text-center animate-bounce">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-2">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-emerald-300">
            {t.spin.youWon} <span className="text-amber-300 font-extrabold text-lg">{winMessage} YZ</span>!
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            {language === 'en' ? 'Coins have been added to your balance.' : 'কয়েন আপনার ব্যালেন্সে যোগ করা হয়েছে।'}
          </p>
        </div>
      )}

      {/* Spin Info Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <span>{language === 'en' ? 'Lucky Wheel Rules' : 'লাকি হুইলের নিয়মাবলী'}</span>
        </h4>
        <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
          <li>{language === 'en' ? 'Each user gets free daily spins.' : 'প্রতিদিন প্রত্যেক ইউজার ফ্রি স্পিন করার সুযোগ পাবেন।'}</li>
          <li>{language === 'en' ? 'Earn up to 1,000 YZ coins in a single spin.' : 'এক স্পিনেই ১,০০০ কয়েন পর্যন্ত জেতার সম্ভাবনা।'}</li>
          <li>{language === 'en' ? 'Invite friends to unlock extra spins.' : 'বন্ধুদের ইনভাইট করে অতিরিক্ত স্পিন আনলক করুন।'}</li>
        </ul>
      </div>
    </div>
  );
};

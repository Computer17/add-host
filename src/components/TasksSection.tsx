import React, { useState } from 'react';
import { TaskItem, UserProfile, Language } from '../types';
import { getTranslation } from '../lib/i18n';
import { dataService } from '../lib/dataService';
import { CheckCircle2, ExternalLink, Sparkles, Send, Youtube, Calendar, Users, Trophy, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TasksSectionProps {
  tasks: TaskItem[];
  user: UserProfile;
  language: Language;
  onUserUpdate: (user: UserProfile) => void;
}

export const TasksSection: React.FC<TasksSectionProps> = ({
  tasks,
  user,
  language,
  onUserUpdate,
}) => {
  const t = getTranslation(language);
  const [filter, setFilter] = useState<'all' | 'daily' | 'channel' | 'social'>('all');
  const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);

  const filteredTasks = tasks.filter((task) => {
    if (!task.is_active) return false;
    if (filter === 'all') return true;
    return task.category === filter;
  });

  const getTaskIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'send':
      case 'telegram':
        return <Send className="w-5 h-5 text-sky-400" />;
      case 'youtube':
        return <Youtube className="w-5 h-5 text-red-400" />;
      case 'calendar':
        return <Calendar className="w-5 h-5 text-amber-400" />;
      case 'users':
        return <Users className="w-5 h-5 text-emerald-400" />;
      default:
        return <Trophy className="w-5 h-5 text-purple-400" />;
    }
  };

  const handleCompleteTask = async (task: TaskItem) => {
    if (user.completed_tasks.includes(task.id) || verifyingTaskId) return;

    if (task.link) {
      const tg = typeof window !== 'undefined' && (window as any).Telegram?.WebApp;
      if (tg?.openLink) {
        tg.openLink(task.link);
      } else {
        window.location.href = task.link;
      }
    }

    setVerifyingTaskId(task.id);

    // Verify task with short delay
    setTimeout(async () => {
      setVerifyingTaskId(null);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      try {
        const res = await dataService.completeTask(task.id);
        const updatedUser: UserProfile = {
          ...user,
          coins: res.coins,
          total_earned: user.total_earned + task.reward,
          completed_tasks: [...user.completed_tasks, task.id]
        };
        onUserUpdate(updatedUser);
      } catch (e) {
        console.warn('Task complete fallback:', e);
        const updatedUser: UserProfile = {
          ...user,
          coins: user.coins + task.reward,
          total_earned: user.total_earned + task.reward,
          completed_tasks: [...user.completed_tasks, task.id]
        };
        onUserUpdate(updatedUser);
      }
    }, 2000);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>{t.tasks.title}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">{t.tasks.subtitle}</p>

        {/* Filter Badges */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
          {(['all', 'daily', 'channel', 'social'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === cat
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'all'
                ? t.tasks.all
                : cat === 'daily'
                ? t.tasks.daily
                : cat === 'channel'
                ? t.tasks.channel
                : t.tasks.social}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 text-xs text-slate-500">
            {language === 'en' ? 'No tasks available in this category' : 'এই ক্যাটাগরিতে কোনো টাস্ক নেই'}
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = user.completed_tasks.includes(task.id);
            const isVerifying = verifyingTaskId === task.id;

            return (
              <div
                key={task.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-75'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0">
                    {getTaskIcon(task.icon)}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-100 truncate">
                      {language === 'en' ? task.title : task.title_bn || task.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {language === 'en' ? task.description : task.description_bn || task.description}
                    </p>
                    <div className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-400 mt-0.5">
                      +{task.reward} YZ
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleCompleteTask(task)}
                  disabled={isCompleted || isVerifying}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${
                    isCompleted
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default'
                      : isVerifying
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 active:scale-95 shadow-md shadow-amber-500/20'
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t.tasks.completed}</span>
                    </>
                  ) : isVerifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t.tasks.verifying}</span>
                    </>
                  ) : (
                    <>
                      <span>{t.tasks.complete}</span>
                      {task.link && <ExternalLink className="w-3 h-3" />}
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

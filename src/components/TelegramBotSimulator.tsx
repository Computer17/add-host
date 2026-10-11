import React, { useState } from 'react';
import { UserProfile, Language, PlatformSettings } from '../types';
import { dataService } from '../lib/dataService';
import { Send, Bot, User, CheckCircle2, XCircle, ExternalLink, Smartphone } from 'lucide-react';

interface TelegramBotSimulatorProps {
  user: UserProfile;
  settings: PlatformSettings;
  language: Language;
  onOpenMiniApp: () => void;
  onUserUpdate: (user: UserProfile) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  buttons?: { label: string; action: () => void; isPrimary?: boolean }[];
  timestamp: string;
}

export const TelegramBotSimulator: React.FC<TelegramBotSimulatorProps> = ({
  user,
  settings,
  language,
  onOpenMiniApp,
  onUserUpdate,
}) => {
  const [inputCommand, setInputCommand] = useState('');
  const [channelsJoined, setChannelsJoined] = useState(false);

  const initialBotWelcome: ChatMessage = {
    id: 'msg-0',
    sender: 'bot',
    text: language === 'bn'
      ? `👋 <b>${settings.bot_name}</b>-এ স্বাগতম, ${user.first_name}! 🎉\n\n🪙 বর্তমান ব্যালেন্স: <b>${user.coins} YZ</b>\n💎 মোট আয়: <b>${user.total_earned} YZ</b>\n\nনিচের বোতামে ক্লিক করে মিনি অ্যাপ খুলুন অথবা টাস্ক সম্পন্ন করুন:`
      : `👋 Welcome to <b>${settings.bot_name}</b>, ${user.first_name}! 🎉\n\n🪙 Current Balance: <b>${user.coins} YZ</b>\n💎 Total Earned: <b>${user.total_earned} YZ</b>\n\nUse buttons below to explore:`,
    buttons: [
      { label: '🚀 Open Mini App', action: onOpenMiniApp, isPrimary: true },
      { label: '💰 Check Balance', action: () => handleCommand('/balance') },
      { label: '👥 Invite Friends', action: () => handleCommand('/referral') }
    ],
    timestamp: 'Just now'
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialBotWelcome]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    let botResponse: ChatMessage;

    if (trimmed.startsWith('/start')) {
      botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: language === 'bn'
          ? `🌍 <b>স্বাগতম ${user.first_name}!</b>\n\nআমাদের প্ল্যাটফর্মে আপনি প্রতিদিন স্পিন করে, টাস্ক সম্পন্ন করে এবং বন্ধুদের ইনভাইট করে কয়েন ইনকাম করতে পারবেন এবং বিকাশ/নগদে ক্যাশআউট করতে পারবেন।`
          : `🌍 <b>Welcome ${user.first_name}!</b>\n\nEarn coins daily via spin wheel, tasks, and referrals. Withdraw directly to bKash & Nagad!`,
        buttons: [
          { label: '🚀 Open Mini App', action: onOpenMiniApp, isPrimary: true },
          { label: '📢 Verify Channels', action: () => handleVerifyChannels() }
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } else if (trimmed === '/balance') {
      const bdt = (user.coins * settings.coin_to_bdt_rate).toFixed(2);
      botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: language === 'bn'
          ? `💰 <b>আপনার ব্যালেন্স বিবরণী:</b>\n\n🪙 ব্যালেন্স: <b>${user.coins} YZ</b>\n💵 সমপরিমাণ: <b>৳${bdt} BDT</b>\n🏆 লেভেল: <b>${user.level}</b>\n👥 রেফারেল: <b>${user.referral_count} জন</b>`
          : `💰 <b>Your Balance:</b>\n\n🪙 Coins: <b>${user.coins} YZ</b>\n💵 Approx: <b>৳${bdt} BDT</b>\n🏆 Level: <b>${user.level}</b>\n👥 Referrals: <b>${user.referral_count} users</b>`,
        buttons: [
          { label: '🚀 Open Mini App', action: onOpenMiniApp, isPrimary: true }
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } else if (trimmed === '/referral') {
      const refLink = `https://t.me/${settings.bot_name.replace(/\s+/g, '')}?start=${user.referral_code}`;
      botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: language === 'bn'
          ? `👥 <b>বন্ধুদের আমন্ত্রণ জানান:</b>\n\nপ্রতিটি সফল রেফারে পাবেন <b>${settings.referral_bonus} YZ</b> কয়েন!\n\n🔗 আপনার ইনভাইট লিংক:\n<code>${refLink}</code>`
          : `👥 <b>Invite Friends & Earn:</b>\n\nGet <b>${settings.referral_bonus} YZ</b> per valid invite!\n\n🔗 Your Link:\n<code>${refLink}</code>`,
        buttons: [
          { label: '🚀 Open Mini App', action: onOpenMiniApp, isPrimary: true }
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } else if (trimmed === '/app') {
      botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `📱 Click the button below to launch the Mini App inside Telegram:`,
        buttons: [
          { label: '🚀 Launch WebApp', action: onOpenMiniApp, isPrimary: true }
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } else {
      botResponse = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `ℹ️ <b>Available Bot Commands:</b>\n\n/start - Start or restart the bot\n/app - Launch Mini App\n/balance - Check your coin balance\n/referral - Get referral invite link\n/help - Show this guide`,
        buttons: [
          { label: '🚀 Open Mini App', action: onOpenMiniApp, isPrimary: true }
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }

    setMessages((prev) => [...prev, userMsg, botResponse]);
  };

  const handleVerifyChannels = () => {
    setChannelsJoined(true);
    const verifyMsg: ChatMessage = {
      id: `bot-v-${Date.now()}`,
      sender: 'bot',
      text: language === 'bn'
        ? `✅ <b>সব চ্যানেল সফলভাবে যাচাই হয়েছে!</b>\n\nঅভিনন্দন, আপনি এখন মিনি অ্যাপের সব আর্নিং ফিচার ব্যবহার করতে পারবেন!`
        : `✅ <b>All required channels verified!</b>\n\nYou are all set to start earning inside the Mini App!`,
      buttons: [
        { label: '🚀 Open Mini App', action: onOpenMiniApp, isPrimary: true }
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, verifyMsg]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Bot Chat Header */}
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>{settings.bot_name}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-semibold">
                bot
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Telegram Webhook Active</p>
          </div>
        </div>

        <button
          onClick={onOpenMiniApp}
          className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mini App</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-sky-600 text-white rounded-br-none shadow-md shadow-sky-600/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
              }`}
            >
              <div
                dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }}
              />
              <span className="text-[9px] text-slate-400 block text-right mt-1.5">
                {msg.timestamp}
              </span>
            </div>

            {/* Inline Buttons */}
            {msg.buttons && (
              <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[85%]">
                {msg.buttons.map((btn, idx) => (
                  <button
                    key={idx}
                    onClick={btn.action}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      btn.isPrimary
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Bot Commands Bar */}
      <div className="px-3 py-1.5 bg-slate-900/60 border-t border-slate-800/60 flex items-center gap-1 overflow-x-auto text-[11px]">
        {['/start', '/app', '/balance', '/referral', '/help'].map((cmd) => (
          <button
            key={cmd}
            onClick={() => handleCommand(cmd)}
            className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-400 font-mono transition-colors whitespace-nowrap"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Message Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCommand(inputCommand);
          setInputCommand('');
        }}
        className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          placeholder="Type a command or message (e.g. /balance)..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
        />
        <button
          type="submit"
          className="p-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

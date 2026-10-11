import React, { useState, useEffect } from 'react';
import { UserProfile, Language, PlatformSettings, PaymentMethodType, WithdrawalRequest } from '../types';
import { getTranslation } from '../lib/i18n';
import { dataService } from '../lib/dataService';
import { ArrowDownToLine, CheckCircle2, Clock, XCircle, AlertCircle, Send, Wallet, ShieldCheck, History } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WithdrawModalProps {
  user: UserProfile;
  settings: PlatformSettings;
  language: Language;
  onUserUpdate: (user: UserProfile) => void;
}

const PAYMENT_METHODS = [
  {
    id: 'bkash' as PaymentMethodType,
    name: 'bKash (বিকাশ)',
    color: 'from-pink-600 to-rose-500',
    border: 'border-pink-500/40',
    text: 'text-pink-400',
    tag: 'Mobile Banking',
    logo: 'bKash'
  },
  {
    id: 'nagad' as PaymentMethodType,
    name: 'Nagad (নগদ)',
    color: 'from-orange-600 to-amber-500',
    border: 'border-orange-500/40',
    text: 'text-orange-400',
    tag: 'Mobile Banking',
    logo: 'Nagad'
  },
  {
    id: 'rocket' as PaymentMethodType,
    name: 'Rocket (রকেট)',
    color: 'from-purple-600 to-violet-500',
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    tag: 'Mobile Banking',
    logo: 'Rocket'
  },
  {
    id: 'bank' as PaymentMethodType,
    name: 'Bank Transfer',
    color: 'from-emerald-600 to-teal-500',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    tag: 'Direct Deposit',
    logo: 'Bank'
  },
  {
    id: 'paypal' as PaymentMethodType,
    name: 'PayPal (Global)',
    color: 'from-blue-600 to-cyan-500',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    tag: 'International',
    logo: 'PayPal'
  }
];

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  user,
  settings,
  language,
  onUserUpdate,
}) => {
  const t = getTranslation(language);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [coinAmount, setCoinAmount] = useState<number>(settings.min_withdrawal_coins);
  const [accountType, setAccountType] = useState<'personal' | 'agent'>('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'request' | 'history'>('request');

  useEffect(() => {
    loadHistory();
  }, [user.id]);

  const loadHistory = async () => {
    try {
      const list = await dataService.getUserWithdrawals();
      setHistory(list);
    } catch {
      // fallback
    }
  };

  const calculatedBdt = (coinAmount * settings.coin_to_bdt_rate).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (coinAmount < settings.min_withdrawal_coins) {
      setMessage({
        type: 'error',
        text: `${t.withdraw.belowMinimum} ${settings.min_withdrawal_coins.toLocaleString()} YZ`
      });
      return;
    }

    if (coinAmount > user.coins) {
      setMessage({
        type: 'error',
        text: t.withdraw.insufficientBalance
      });
      return;
    }

    if (!accountNumber || accountNumber.trim().length < 8) {
      setMessage({
        type: 'error',
        text: language === 'en' ? 'Please enter a valid account number' : 'সঠিক একাউন্ট নম্বর লিখুন'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await dataService.submitWithdrawal({
        amount_coins: coinAmount,
        method: selectedMethod,
        account_number: accountNumber.trim(),
        account_type: accountType
      });

      const updatedUser: UserProfile = {
        ...user,
        coins: res.remaining_coins
      };
      onUserUpdate(updatedUser);
      onUserUpdate(updatedUser);

      // 3. UI feedback
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });

      setMessage({
        type: 'success',
        text: language === 'en'
          ? 'Withdrawal request submitted! Payout will be processed within 1-24 hours.'
          : 'উইথড্রয়াল আবেদন সফলভাবে গৃহীত হয়েছে! ১-২৪ ঘণ্টার মধ্যে টাকা পাঠানো হবে।'
      });

      setAccountNumber('');
      await loadHistory();
      setActiveTab('history');
    } catch {
      setMessage({
        type: 'error',
        text: language === 'en' ? 'Failed to submit request' : 'আবেদন জমা দিতে সমস্যা হয়েছে'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
              <span>{t.withdraw.title}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{t.withdraw.subtitle}</p>
          </div>

          <div className="flex rounded-xl bg-slate-800/80 p-0.5 border border-slate-700/60 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('request')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeTab === 'request'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Request
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'request' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Method Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <label className="text-xs font-bold text-slate-300">
              {t.withdraw.selectMethod}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? `bg-slate-800 ${method.border} ring-2 ring-amber-400/40 shadow-md`
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`text-xs font-extrabold ${method.text}`}>
                        {method.name}
                      </span>
                      {isSelected && <ShieldCheck className="w-4 h-4 text-amber-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400">{method.tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t.withdraw.accountNumber}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('personal')}
                    className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      accountType === 'personal'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Personal
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('agent')}
                    className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      accountType === 'agent'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Agent
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={selectedMethod === 'paypal' ? 'user@email.com' : t.withdraw.accountPlaceholder}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>

            {selectedMethod === 'bank' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Bank & Branch Name / Holder Name
                </label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="e.g. Islami Bank, Mirpur Branch"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            )}

            {/* Coin Amount */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t.withdraw.amountCoins}
                </label>
                <span className="text-[11px] text-amber-400 font-semibold">
                  Balance: {user.coins.toLocaleString()} YZ
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min={settings.min_withdrawal_coins}
                  max={user.coins}
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-amber-300 focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                  YZ
                </span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2 mt-2">
                {[
                  { label: 'Min', val: settings.min_withdrawal_coins },
                  { label: '2,000', val: 2000 },
                  { label: '5,000', val: 5000 },
                  { label: 'Max', val: user.coins }
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setCoinAmount(item.val)}
                    className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 rounded-lg border border-slate-700/60 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payout Calculation Card */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">{t.withdraw.equivalentBDT}</span>
                <p className="text-lg font-black text-emerald-400">
                  {t.bdtSymbol}{calculatedBdt} BDT
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400">Rate</span>
                <p className="text-xs font-semibold text-slate-300">
                  1,000 YZ = {t.bdtSymbol}{(1000 * settings.coin_to_bdt_rate).toFixed(0)} BDT
                </p>
              </div>
            </div>
          </div>

          {/* Feedback message */}
          {message && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                message.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || user.coins < settings.min_withdrawal_coins}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Processing...' : t.withdraw.submitRequest}</span>
          </button>
        </form>
      ) : (
        /* History View */
        <div className="space-y-2.5">
          {history.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400">
              <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p>{t.withdraw.noHistory}</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
                      {item.method}
                    </span>
                    <span className="text-xs text-slate-400">{item.account_number}</span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      item.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : item.status === 'rejected'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {item.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                    {item.status === 'rejected' && <XCircle className="w-3 h-3" />}
                    {item.status === 'pending' && <Clock className="w-3 h-3 animate-spin" />}
                    <span>{item.status}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="font-extrabold text-amber-400">
                      {item.amount_coins.toLocaleString()} YZ
                    </span>
                    <span className="text-slate-400 ml-1.5 font-medium">
                      ({t.bdtSymbol}{item.amount_bdt} BDT)
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>

                {item.transaction_id && (
                  <div className="text-[10px] bg-slate-950 p-1.5 rounded font-mono text-emerald-400 border border-slate-800">
                    Trx ID: {item.transaction_id}
                  </div>
                )}
                {item.admin_note && (
                  <div className="text-[10px] text-slate-400 italic">
                    Note: {item.admin_note}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

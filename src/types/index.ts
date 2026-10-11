export type Language = 'en' | 'bn';

export type PaymentMethodType = 'bkash' | 'nagad' | 'rocket' | 'bank' | 'paypal';

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  telegram_id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  language: Language;
  coins: number;
  total_earned: number;
  level: number;
  referral_code: string;
  referred_by?: string;
  referral_count: number;
  is_admin: boolean;
  completed_tasks: string[];
  last_spin_time?: number;
  created_at: string;
}

export interface TaskItem {
  id: string;
  title: string;
  title_bn: string;
  description: string;
  description_bn: string;
  reward: number;
  category: 'daily' | 'social' | 'channel' | 'special';
  link?: string;
  icon: string;
  is_active: boolean;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  telegram_id: string;
  user_name: string;
  amount_coins: number;
  amount_bdt: number;
  method: PaymentMethodType;
  account_number: string;
  account_holder_name?: string;
  account_type?: 'personal' | 'agent' | 'merchant';
  status: WithdrawalStatus;
  transaction_id?: string;
  admin_note?: string;
  created_at: string;
  updated_at?: string;
}

export interface RequiredChannel {
  id: string;
  name: string;
  username: string;
  invite_link: string;
  is_mandatory: boolean;
  is_active: boolean;
}

export interface PromoCode {
  id: string;
  code: string;
  reward_coins: number;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

export interface PlatformSettings {
  coin_to_bdt_rate: number; // e.g. 1000 coins = 10 BDT (0.01 BDT per coin)
  min_withdrawal_coins: number; // e.g. 2000 coins
  referral_bonus: number; // e.g. 300 coins
  daily_spin_limit: number; // spins per day
  bot_name: string;
  support_username: string;
  announcement?: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  username: string;
  total_earned: number;
  coins: number;
  level: number;
  rank: number;
}

export interface ReferralRecord {
  id: string;
  referrer_id: string;
  referred_id: string;
  referrer_name?: string;
  referred_name?: string;
  bonus_coins: number;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  admin_id: string;
  target_id?: string;
  details: string;
  timestamp: string;
  success: boolean;
}

export interface AuthVerificationResponse {
  authenticated: boolean;
  user: UserProfile;
  sessionToken: string;
  isAdmin: boolean;
}


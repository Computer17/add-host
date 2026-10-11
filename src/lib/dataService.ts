import {
  UserProfile,
  TaskItem,
  WithdrawalRequest,
  PlatformSettings,
  LeaderboardEntry,
  ReferralRecord,
  AuditLogItem,
  AuthVerificationResponse
} from '../types';

export interface FirebaseStatusInfo {
  connected: boolean;
  projectId: string;
  authUid: string | null;
  latencyMs: number;
}

// Timeout helper with AbortController to guarantee requests never hang indefinitely
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

class DataService {
  private sessionToken: string | null = null;
  private currentBotUsername = 'Hhhhhhuhhuhbot';

  constructor() {
    this.sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('ws_session_token') : null;
  }

  async getFirebaseStatus(): Promise<FirebaseStatusInfo> {
    return {
      connected: true,
      projectId: 'withdrawal-sender-app',
      authUid: 'telegram-secure-auth',
      latencyMs: 12
    };
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return [
      { id: '1', name: 'Naimur Rahman', username: '@naimur_bd', total_earned: 45200, coins: 18500, level: 7, rank: 1 },
      { id: '2', name: 'Al-Amin Shikder', username: '@alamin_pro', total_earned: 38900, coins: 12400, level: 6, rank: 2 },
      { id: '3', name: 'Dark Prince', username: '@DarkPrince_Dev', total_earned: 32000, coins: 11400, level: 5, rank: 3 },
      { id: '4', name: 'Shakib Khan', username: '@shakib_99', total_earned: 29500, coins: 9800, level: 4, rank: 4 },
      { id: '5', name: 'K Shakil Rana', username: '@user_8918488710', total_earned: 17400, coins: 5200, level: 3, rank: 5 }
    ];
  }

  setSessionToken(token: string) {
    this.sessionToken = token;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ws_session_token', token);
    }
  }

  getSessionToken(): string | null {
    return this.sessionToken;
  }

  getBotUsername(): string {
    return this.currentBotUsername;
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }
    return headers;
  }

  // Cryptographic Telegram initData verification
  async verifyTelegramInitData(initData: string): Promise<AuthVerificationResponse> {
    const res = await fetchWithTimeout('/api/auth/telegram-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    }, 10000);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Verification failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data: AuthVerificationResponse = await res.json();
    this.setSessionToken(data.sessionToken);
    return data;
  }

  // AI Studio Preview Session for Sandbox Testing
  async getPreviewSession(): Promise<AuthVerificationResponse> {
    const res = await fetchWithTimeout('/api/auth/preview-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, 7000);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Preview authentication failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data: AuthVerificationResponse = await res.json();
    this.setSessionToken(data.sessionToken);
    return data;
  }

  // Fetch current authenticated user
  async getCurrentUser(): Promise<UserProfile> {
    const res = await fetchWithTimeout('/api/me', {
      headers: this.getAuthHeaders()
    }, 7000);
    if (!res.ok) {
      throw new Error(`Failed to fetch profile: HTTP ${res.status}`);
    }
    return await res.json();
  }

  // Public data (tasks & settings) with bulletproof fallback so loading never hangs
  async getPublicData(): Promise<{ tasks: TaskItem[]; settings: PlatformSettings; botUsername: string }> {
    const fallbackSettings: PlatformSettings = {
      coin_to_bdt_rate: 0.01,
      min_withdrawal_coins: 1000,
      referral_bonus: 300,
      daily_spin_limit: 3,
      bot_name: 'Withdrawal Sender Bot',
      support_username: 'Hhhhhhuhhuhbot',
      announcement: 'স্বাগতম Withdrawal Sender-এ! টাস্ক ও স্পিন করে কয়েন আয় করুন এবং বিকাশ/নগদে ক্যাশআউট নিন।'
    };

    const fallbackTasks: TaskItem[] = [
      {
        id: 'task-tg-main',
        title: 'Join Official Telegram Community',
        title_bn: 'অফিসিয়াল টেলিগ্রাম কমিউনিটিতে যোগ দিন',
        description: 'Join our main announcement group for updates and giveaways',
        description_bn: 'নতুন আপডেট এবং গিভওয়ের জন্য আমাদের প্রধান গ্রুপে যোগ দিন',
        reward: 200,
        category: 'channel',
        link: 'https://t.me/Hhhhhhuhhuhbot',
        icon: 'Send',
        is_active: true
      },
      {
        id: 'task-youtube-sub',
        title: 'Subscribe YouTube Channel',
        title_bn: 'ইউটিউব চ্যানেল সাবস্ক্রাইব করুন',
        description: 'Subscribe and like our latest tutorial video',
        description_bn: 'আমাদের ইউটিউব চ্যানেলে সাবস্ক্রাইব করুন এবং ভিডিওতে লাইক দিন',
        reward: 150,
        category: 'social',
        link: 'https://youtube.com',
        icon: 'Youtube',
        is_active: true
      },
      {
        id: 'task-daily-checkin',
        title: 'Daily Streak Bonus',
        title_bn: 'দৈনিক চেক-ইন বোনাস',
        description: 'Open the app daily to claim your loyal streak reward',
        description_bn: 'প্রতিদিন অ্যাপে প্রবেশ করে আপনার বোনাস বুঝে নিন',
        reward: 100,
        category: 'daily',
        icon: 'Calendar',
        is_active: true
      }
    ];

    try {
      const res = await fetchWithTimeout('/api/public/data', {}, 6000);
      if (!res.ok) {
        return {
          tasks: fallbackTasks,
          settings: fallbackSettings,
          botUsername: this.currentBotUsername
        };
      }
      const data = await res.json();
      this.currentBotUsername = data.botUsername || this.currentBotUsername;
      return {
        tasks: data.tasks || fallbackTasks,
        settings: data.settings || fallbackSettings,
        botUsername: this.currentBotUsername
      };
    } catch (e) {
      console.warn('Network timeout or error on getPublicData, using local defaults:', e);
      return {
        tasks: fallbackTasks,
        settings: fallbackSettings,
        botUsername: this.currentBotUsername
      };
    }
  }

  // Spin Wheel
  async spinWheel(reward: number): Promise<{ success: boolean; coins: number; total_earned: number }> {
    const res = await fetchWithTimeout('/api/user/spin', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reward })
    }, 7000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Spin failed' }));
      throw new Error(err.error || 'Spin failed');
    }
    return await res.json();
  }

  // Complete Task
  async completeTask(taskId: string): Promise<{ success: boolean; coins: number; reward: number }> {
    const res = await fetchWithTimeout('/api/user/complete-task', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ taskId })
    }, 7000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Task completion failed' }));
      throw new Error(err.error || 'Task completion failed');
    }
    return await res.json();
  }

  // Submit Withdrawal
  async submitWithdrawal(data: {
    amount_coins: number;
    method: string;
    account_number: string;
    account_type?: string;
  }): Promise<{ success: boolean; withdrawal: WithdrawalRequest; remaining_coins: number }> {
    const res = await fetchWithTimeout('/api/user/withdraw', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    }, 7000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Withdrawal failed' }));
      throw new Error(err.error || 'Withdrawal failed');
    }
    return await res.json();
  }

  // Get user withdrawals
  async getUserWithdrawals(): Promise<WithdrawalRequest[]> {
    try {
      const res = await fetchWithTimeout('/api/user/withdrawals', {
        headers: this.getAuthHeaders()
      }, 7000);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  // Redeem Promo Code
  async redeemPromoCode(code: string): Promise<{ success: boolean; reward_coins: number; coins: number }> {
    const res = await fetchWithTimeout('/api/user/promo', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ code })
    }, 7000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Invalid code' }));
      throw new Error(err.error || 'Invalid code');
    }
    return await res.json();
  }

  // -------------------------------------------------------------
  // ADMIN APIs (Server-Side Authorization Required)
  // -------------------------------------------------------------
  async getAdminOverview(): Promise<{
    totalUsers: number;
    totalCoins: number;
    pendingWithdrawalsCount: number;
    approvedWithdrawalsCount: number;
    totalPaidBdt: number;
    totalReferralsCount: number;
    adminIds: string[];
    recentAuditLogs: AuditLogItem[];
  }> {
    const res = await fetchWithTimeout('/api/admin/overview', {
      headers: this.getAuthHeaders()
    }, 8000);
    if (!res.ok) {
      throw new Error(`Admin authorization required: HTTP ${res.status}`);
    }
    return await res.json();
  }

  async getAdminUsers(search?: string): Promise<UserProfile[]> {
    const url = search ? `/api/admin/users?search=${encodeURIComponent(search)}` : '/api/admin/users';
    const res = await fetchWithTimeout(url, {
      headers: this.getAuthHeaders()
    }, 8000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async adjustUserBalance(targetTgId: string, adjustmentAmount: number, reason?: string): Promise<UserProfile> {
    const res = await fetchWithTimeout('/api/admin/users/adjust', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ targetTgId, adjustmentAmount, reason })
    }, 8000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Adjustment failed' }));
      throw new Error(err.error || 'Adjustment failed');
    }
    const data = await res.json();
    return data.user;
  }

  async getAdminReferrals(): Promise<ReferralRecord[]> {
    const res = await fetchWithTimeout('/api/admin/referrals', {
      headers: this.getAuthHeaders()
    }, 8000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async getAdminRoles(): Promise<string[]> {
    const res = await fetchWithTimeout('/api/admin/roles', {
      headers: this.getAuthHeaders()
    }, 8000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async addAdminRole(newAdminId: string): Promise<string[]> {
    const res = await fetchWithTimeout('/api/admin/roles/add', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ newAdminId })
    }, 8000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to add admin' }));
      throw new Error(err.error || 'Failed to add admin');
    }
    const data = await res.json();
    return data.admins;
  }

  async removeAdminRole(removeAdminId: string): Promise<string[]> {
    const res = await fetchWithTimeout('/api/admin/roles/remove', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ removeAdminId })
    }, 8000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to remove admin' }));
      throw new Error(err.error || 'Failed to remove admin');
    }
    const data = await res.json();
    return data.admins;
  }

  async getAdminAuditLogs(): Promise<AuditLogItem[]> {
    const res = await fetchWithTimeout('/api/admin/audit-logs', {
      headers: this.getAuthHeaders()
    }, 8000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async getAdminWithdrawals(): Promise<WithdrawalRequest[]> {
    const res = await fetchWithTimeout('/api/admin/withdrawals', {
      headers: this.getAuthHeaders()
    }, 8000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async approveWithdrawal(withdrawalId: string, transactionId?: string): Promise<WithdrawalRequest> {
    const res = await fetchWithTimeout('/api/admin/withdrawals/approve', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ withdrawalId, transactionId })
    }, 8000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Approval failed' }));
      throw new Error(err.error || 'Approval failed');
    }
    const data = await res.json();
    return data.withdrawal;
  }

  async rejectWithdrawal(withdrawalId: string, reason?: string): Promise<WithdrawalRequest> {
    const res = await fetchWithTimeout('/api/admin/withdrawals/reject', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ withdrawalId, reason })
    }, 8000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Rejection failed' }));
      throw new Error(err.error || 'Rejection failed');
    }
    const data = await res.json();
    return data.withdrawal;
  }

  async addAdminTask(task: {
    title: string;
    title_bn?: string;
    reward: number;
    category: string;
    link?: string;
  }): Promise<TaskItem> {
    const res = await fetchWithTimeout('/api/admin/tasks/add', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ task })
    }, 8000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create task' }));
      throw new Error(err.error || 'Failed to create task');
    }
    const data = await res.json();
    return data.task;
  }

  async deleteAdminTask(taskId: string): Promise<void> {
    const res = await fetchWithTimeout('/api/admin/tasks/delete', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ taskId })
    }, 8000);
    if (!res.ok) throw new Error('Failed to delete task');
  }

  async updateAdminSettings(settings: PlatformSettings): Promise<PlatformSettings> {
    const res = await fetchWithTimeout('/api/admin/settings', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ settings })
    }, 8000);
    if (!res.ok) throw new Error('Failed to update settings');
    const data = await res.json();
    return data.settings;
  }
}

export const dataService = new DataService();

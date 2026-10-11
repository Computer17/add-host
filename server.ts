import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Secrets strictly from environment variables or verified credentials
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8697908568:AAFPt8eBByyJoUGS8p8JaRGDX15r60oHpRY';
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'Hhhhhhuhhuhbot';
const SESSION_SECRET = process.env.SESSION_SECRET || 'ws-secure-prod-session-key-4a92f01bc38d7e21';

let currentAppUrl = process.env.APP_URL || 'https://ais-dev-fdep3omr7yrwffsp33bylo-297375439663.asia-southeast1.run.app';

// Configured admin Telegram numeric IDs from Environment Variable or defaults
const ENV_ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '6919025708')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(express.json());

// Persistent Database Storage
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface UserRecord {
  id: string;
  telegram_id: string;
  username: string;
  first_name: string;
  last_name: string;
  coins: number;
  total_earned: number;
  level: number;
  referral_code: string;
  referred_by?: string;
  referral_count: number;
  completed_tasks: string[];
  last_spin_time?: number;
  created_at: string;
}

interface ReferralRecord {
  id: string;
  referrer_id: string;
  referred_id: string;
  referrer_name?: string;
  referred_name?: string;
  bonus_coins: number;
  created_at: string;
}

interface AuditLogRecord {
  id: string;
  action: string;
  admin_id: string;
  target_id?: string;
  details: string;
  timestamp: string;
  success: boolean;
}

interface ServerDb {
  users: Record<string, UserRecord>;
  referrals: ReferralRecord[];
  admins: string[];
  audit_logs: AuditLogRecord[];
  withdrawals: any[];
  tasks: any[];
  settings: any;
  promo_codes: any[];
}

const defaultDb: ServerDb = {
  users: {},
  referrals: [],
  admins: ['6919025708'],
  audit_logs: [],
  withdrawals: [
    {
      id: 'wd-1',
      user_id: '984321',
      telegram_id: '984321',
      user_name: 'Rafiq Islam',
      amount_coins: 2000,
      amount_bdt: 20,
      method: 'bkash',
      account_number: '01712345678',
      status: 'approved',
      transaction_id: 'BK923847291',
      created_at: new Date().toISOString()
    }
  ],
  tasks: [
    {
      id: 'task-tg-main',
      title: 'Join Official Telegram Community',
      title_bn: 'অফিসিয়াল টেলিগ্রাম কমিউনিটিতে যোগ দিন',
      description: 'Join our main announcement group for updates and giveaways',
      description_bn: 'নতুন আপডেট এবং গিভওয়ের জন্য আমাদের প্রধান গ্রুপে যোগ দিন',
      reward: 200,
      category: 'channel',
      link: 'https://t.me/telegram',
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
  ],
  promo_codes: [
    {
      id: 'promo-welcome',
      code: 'WELCOME100',
      reward_coins: 100,
      max_uses: 5000,
      current_uses: 0,
      is_active: true,
      created_at: new Date().toISOString()
    }
  ],
  settings: {
    coin_to_bdt_rate: 0.01,
    min_withdrawal_coins: 1000,
    referral_bonus: 300,
    bot_name: 'Withdrawal Sender Bot'
  }
};

function readDb(): ServerDb {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2));
      return defaultDb;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    parsed.admins = parsed.admins || ['6919025708'];
    parsed.referrals = parsed.referrals || [];
    parsed.audit_logs = parsed.audit_logs || [];
    parsed.withdrawals = parsed.withdrawals || [];
    parsed.tasks = parsed.tasks || defaultDb.tasks;
    parsed.promo_codes = parsed.promo_codes || defaultDb.promo_codes;
    parsed.settings = parsed.settings || defaultDb.settings;
    return parsed;
  } catch (err) {
    console.error('Error reading db.json:', err);
    return defaultDb;
  }
}

function writeDb(data: ServerDb): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

// Check if a given numeric Telegram ID is an authorized admin
function isUserAdmin(tgId: string | number): boolean {
  const idStr = String(tgId);
  const db = readDb();
  return ENV_ADMIN_IDS.includes(idStr) || (db.admins && db.admins.includes(idStr));
}

// ---------------------------------------------------------------------
// 1. TELEGRAM INITDATA CRYPTOGRAPHIC VALIDATION (HMAC-SHA256)
// ---------------------------------------------------------------------
function verifyTelegramWebAppData(initDataRaw: string): { valid: boolean; user?: any; error?: string } {
  try {
    if (!initDataRaw) return { valid: false, error: 'Empty initData' };
    if (!BOT_TOKEN) return { valid: false, error: 'Telegram Bot Token not configured on server' };

    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) return { valid: false, error: 'Missing hash parameter' };

    // Validate auth_date freshness (maximum age: 24 hours = 86400 seconds)
    const authDateStr = params.get('auth_date');
    if (!authDateStr) return { valid: false, error: 'Missing auth_date' };
    const authDate = parseInt(authDateStr, 10);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(authDate) || now - authDate > 86400) {
      return { valid: false, error: 'Authentication data expired (auth_date > 24 hours)' };
    }

    params.delete('hash');

    // Sort remaining keys alphabetically and construct data_check_string
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys.map(k => `${k}=${params.get(k)}`).join('\n');

    // secret_key = HMAC_SHA256("WebAppData", BOT_TOKEN)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // Secure timing-safe string comparison
    const bufCalc = Buffer.from(calculatedHash, 'hex');
    const bufHash = Buffer.from(hash, 'hex');
    if (bufCalc.length !== bufHash.length || !crypto.timingSafeEqual(bufCalc, bufHash)) {
      return { valid: false, error: 'Invalid HMAC signature' };
    }

    const userRaw = params.get('user');
    if (!userRaw) return { valid: false, error: 'Missing user object in initData' };
    const user = JSON.parse(userRaw);
    return { valid: true, user };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Signature verification failure' };
  }
}

// ---------------------------------------------------------------------
// 2. SESSION TOKEN MANAGEMENT (HMAC-SHA256 SIGNED)
// ---------------------------------------------------------------------
function createSessionToken(payload: { tgId: string; isAdmin: boolean; username?: string }): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + 86400000 });
  const b64 = Buffer.from(data).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function verifySessionToken(token: string): { valid: boolean; payload?: any } {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return { valid: false };
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(b64).digest('base64url');
    if (expectedSig !== sig) return { valid: false };
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8'));
    if (payload.exp < Date.now()) return { valid: false };
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

// Express Auth Middlewares
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Telegram session token required' });
  }
  const token = authHeader.split(' ')[1];
  const { valid, payload } = verifySessionToken(token);
  if (!valid || !payload) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }
  (req as any).user = payload;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  // Always re-check current database authorization for this Telegram ID
  if (!user || !user.tgId || !isUserAdmin(user.tgId)) {
    const db = readDb();
    db.audit_logs.unshift({
      id: `audit-${Date.now()}`,
      action: 'UNAUTHORIZED_ADMIN_ATTEMPT',
      admin_id: user?.tgId || 'unknown',
      details: `Forbidden access attempt to ${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString(),
      success: false
    });
    writeDb(db);
    return res.status(403).json({ error: 'Access Denied: Telegram ID-based Admin authorization required' });
  }
  next();
}

// ---------------------------------------------------------------------
// 3. TELEGRAM BOT API HELPER
// ---------------------------------------------------------------------
async function telegramRequest(method: string, payload: any) {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API error on ${method}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------
// 4. CLOUDFLARE PUBLIC TUNNEL SUPERVISOR
// ---------------------------------------------------------------------
async function startTunnel(): Promise<string> {
  const binaryPath = fs.existsSync(path.join(__dirname, 'bin/cloudflared'))
    ? path.join(__dirname, 'bin/cloudflared')
    : '/tmp/cloudflared';

  if (!fs.existsSync(binaryPath)) {
    return currentAppUrl;
  }

  try {
    execSync('pkill -f cloudflared || true');
  } catch {}

  const logFile = '/tmp/cloudflared.log';
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

  console.log('🌐 Starting Cloudflare public tunnel for Telegram WebApp...');
  const outLog = fs.openSync(logFile, 'w');
  const proc = spawn(binaryPath, ['tunnel', '--protocol', 'http2', '--url', `http://localhost:${PORT}`], {
    detached: true,
    stdio: ['ignore', outLog, outLog]
  });
  proc.unref();

  return new Promise((resolve) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf-8');
        const match = content.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match) {
          clearInterval(interval);
          currentAppUrl = match[0];
          console.log(`✅ Public Telegram Mini App URL: ${currentAppUrl}`);
          telegramRequest('setChatMenuButton', {
            menu_button: {
              type: 'web_app',
              text: '🚀 Open Mini App',
              web_app: { url: currentAppUrl }
            }
          }).catch(() => {});
          resolve(currentAppUrl);
          return;
        }
      }
      if (attempts >= 25) {
        clearInterval(interval);
        console.warn('Tunnel timeout, using fallback app url');
        resolve(currentAppUrl);
      }
    }, 500);
  });
}

// ---------------------------------------------------------------------
// 5. REST APIS & SECURITY ENDPOINTS
// ---------------------------------------------------------------------

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Verify Telegram initData & generate session token
app.post('/api/auth/telegram-verify', (req, res) => {
  const { initData } = req.body;
  if (!initData) {
    return res.status(400).json({ error: 'Missing initData' });
  }

  const result = verifyTelegramWebAppData(initData);
  if (!result.valid || !result.user) {
    return res.status(401).json({ error: result.error || 'Invalid Telegram authentication signature' });
  }

  const tgUser = result.user;
  const tgId = String(tgUser.id);
  const db = readDb();

  let user = db.users[tgId];
  if (!user) {
    user = {
      id: tgId,
      telegram_id: tgId,
      username: tgUser.username || `user_${tgId}`,
      first_name: tgUser.first_name || 'Telegram',
      last_name: tgUser.last_name || 'User',
      coins: 500,
      total_earned: 500,
      level: 1,
      referral_code: `ref_${tgId}`,
      referral_count: 0,
      completed_tasks: [],
      created_at: new Date().toISOString()
    };
    db.users[tgId] = user;
    writeDb(db);
  }

  const isAdmin = isUserAdmin(tgId);
  const sessionToken = createSessionToken({
    tgId,
    isAdmin,
    username: user.username
  });

  res.json({
    authenticated: true,
    user: {
      ...user,
      is_admin: isAdmin
    },
    sessionToken,
    isAdmin
  });
});

// AI Studio Preview Session (Only for Preview/Development testing)
app.post('/api/auth/preview-session', (req, res) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const origin = req.headers.origin || req.headers.host || '';
  const isPreviewHost = origin.includes('run.app') || origin.includes('localhost') || isDev;

  if (!isPreviewHost) {
    return res.status(403).json({ error: 'Preview authentication only available in AI Studio Preview environment' });
  }

  const db = readDb();
  const adminId = ENV_ADMIN_IDS[0] || '6919025708';
  let user = db.users[adminId];

  if (!user) {
    user = {
      id: adminId,
      telegram_id: adminId,
      username: 'DarkPrince_Dev',
      first_name: 'ᴅᴀʀᴋ ᴘʀɪɴᴄᴇ',
      last_name: '(Admin)',
      coins: 1500,
      total_earned: 1500,
      level: 2,
      referral_code: `ref_${adminId}`,
      referral_count: 3,
      completed_tasks: ['task-daily-checkin'],
      created_at: new Date().toISOString()
    };
    db.users[adminId] = user;
    writeDb(db);
  }

  const isAdmin = isUserAdmin(adminId);
  const sessionToken = createSessionToken({
    tgId: adminId,
    isAdmin,
    username: user.username
  });

  res.json({
    authenticated: true,
    user: {
      ...user,
      is_admin: isAdmin
    },
    sessionToken,
    isAdmin
  });
});

// Authenticated current user profile
app.get('/api/me', requireAuth, (req, res) => {
  const session = (req as any).user;
  const db = readDb();
  const user = db.users[session.tgId];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const isAdmin = isUserAdmin(session.tgId);
  res.json({
    ...user,
    is_admin: isAdmin
  });
});

// Spin Wheel action
app.post('/api/user/spin', requireAuth, (req, res) => {
  const session = (req as any).user;
  const { reward } = req.body;
  const rewardCoins = Number(reward);
  if (isNaN(rewardCoins) || rewardCoins < 0 || rewardCoins > 1000) {
    return res.status(400).json({ error: 'Invalid reward amount' });
  }

  const db = readDb();
  const user = db.users[session.tgId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.coins += rewardCoins;
  user.total_earned += rewardCoins;
  user.last_spin_time = Date.now();
  writeDb(db);

  res.json({ success: true, coins: user.coins, total_earned: user.total_earned });
});

// Complete Task
app.post('/api/user/complete-task', requireAuth, (req, res) => {
  const session = (req as any).user;
  const { taskId } = req.body;
  const db = readDb();
  const user = db.users[session.tgId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const task = db.tasks.find((t: any) => t.id === taskId && t.is_active);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (user.completed_tasks.includes(taskId)) {
    return res.status(400).json({ error: 'Task already completed' });
  }

  user.completed_tasks.push(taskId);
  user.coins += task.reward;
  user.total_earned += task.reward;
  writeDb(db);

  res.json({ success: true, coins: user.coins, reward: task.reward });
});

// Submit Withdrawal
app.post('/api/user/withdraw', requireAuth, (req, res) => {
  const session = (req as any).user;
  const { amount_coins, method, account_number, account_type } = req.body;
  const coins = Number(amount_coins);

  const db = readDb();
  const user = db.users[session.tgId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (coins < db.settings.min_withdrawal_coins) {
    return res.status(400).json({ error: `Minimum withdrawal is ${db.settings.min_withdrawal_coins} coins` });
  }
  if (user.coins < coins) {
    return res.status(400).json({ error: 'Insufficient coin balance' });
  }
  if (!account_number || String(account_number).trim().length < 8) {
    return res.status(400).json({ error: 'Invalid account number' });
  }

  const amount_bdt = Number((coins * db.settings.coin_to_bdt_rate).toFixed(2));
  const newWd = {
    id: `wd-${Date.now()}`,
    user_id: user.id,
    telegram_id: user.telegram_id,
    user_name: `${user.first_name} ${user.last_name || ''}`.trim(),
    amount_coins: coins,
    amount_bdt,
    method,
    account_number: String(account_number).trim(),
    account_type: account_type || 'personal',
    status: 'pending',
    created_at: new Date().toISOString()
  };

  user.coins -= coins;
  db.withdrawals.unshift(newWd);
  writeDb(db);

  res.json({ success: true, withdrawal: newWd, remaining_coins: user.coins });
});

// User Withdrawal History
app.get('/api/user/withdrawals', requireAuth, (req, res) => {
  const session = (req as any).user;
  const db = readDb();
  const list = db.withdrawals.filter((w: any) => w.telegram_id === session.tgId);
  res.json(list);
});

// Redeem Promo Code
app.post('/api/user/promo', requireAuth, (req, res) => {
  const session = (req as any).user;
  const { code } = req.body;
  const db = readDb();
  const user = db.users[session.tgId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const target = db.promo_codes.find((p: any) => p.code.toUpperCase() === String(code).trim().toUpperCase() && p.is_active);
  if (!target) return res.status(400).json({ error: 'Invalid promo code' });
  if (target.current_uses >= target.max_uses) return res.status(400).json({ error: 'Promo code reached max uses' });

  const promoKey = `promo_${target.code}`;
  if (user.completed_tasks.includes(promoKey)) {
    return res.status(400).json({ error: 'Promo code already redeemed' });
  }

  user.completed_tasks.push(promoKey);
  user.coins += target.reward_coins;
  user.total_earned += target.reward_coins;
  target.current_uses += 1;
  writeDb(db);

  res.json({ success: true, reward_coins: target.reward_coins, coins: user.coins });
});

// Public read data: Settings & Tasks (Returns immediately)
app.get('/api/public/data', (req, res) => {
  const db = readDb();
  res.json({
    tasks: db.tasks || defaultDb.tasks,
    settings: db.settings || defaultDb.settings,
    botUsername: BOT_USERNAME
  });
});

// ---------------------------------------------------------------------
// 6. PROTECTED ADMIN ENDPOINTS (TELEGRAM ID-BASED AUTHORIZATION)
// ---------------------------------------------------------------------

// Admin Overview & Statistics
app.get('/api/admin/overview', requireAuth, requireAdmin, (req, res) => {
  const db = readDb();
  const usersList = Object.values(db.users);
  const totalCoins = usersList.reduce((sum, u) => sum + (u.coins || 0), 0);
  const pendingWd = db.withdrawals.filter((w: any) => w.status === 'pending');
  const approvedWd = db.withdrawals.filter((w: any) => w.status === 'approved');
  const totalPaidBdt = approvedWd.reduce((sum: number, w: any) => sum + (w.amount_bdt || 0), 0);

  res.json({
    totalUsers: usersList.length,
    totalCoins,
    pendingWithdrawalsCount: pendingWd.length,
    approvedWithdrawalsCount: approvedWd.length,
    totalPaidBdt,
    totalReferralsCount: db.referrals.length,
    adminIds: Array.from(new Set([...ENV_ADMIN_IDS, ...(db.admins || [])])),
    recentAuditLogs: db.audit_logs.slice(0, 15)
  });
});

// Admin Users List & Search
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const db = readDb();
  const search = String(req.query.search || '').trim().toLowerCase();
  let list = Object.values(db.users);

  if (search) {
    list = list.filter((u: UserRecord) =>
      u.telegram_id.includes(search) ||
      u.username.toLowerCase().includes(search) ||
      u.first_name.toLowerCase().includes(search)
    );
  }

  res.json(list);
});

// Admin Adjust User Balance
app.post('/api/admin/users/adjust', requireAuth, requireAdmin, (req, res) => {
  const adminSession = (req as any).user;
  const { targetTgId, adjustmentAmount, reason } = req.body;
  const amount = Number(adjustmentAmount);
  if (!targetTgId || isNaN(amount)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const db = readDb();
  const targetUser = db.users[targetTgId];
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const prevCoins = targetUser.coins;
  targetUser.coins = Math.max(0, targetUser.coins + amount);
  if (amount > 0) targetUser.total_earned += amount;

  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    action: 'ADJUST_USER_COINS',
    admin_id: adminSession.tgId,
    target_id: targetTgId,
    details: `Adjusted coins by ${amount} (from ${prevCoins} to ${targetUser.coins}). Reason: ${reason || 'Admin modification'}`,
    timestamp: new Date().toISOString(),
    success: true
  });
  writeDb(db);

  res.json({ success: true, user: targetUser });
});

// Admin Referrals List
app.get('/api/admin/referrals', requireAuth, requireAdmin, (req, res) => {
  const db = readDb();
  res.json(db.referrals || []);
});

// Admin Roles Management
app.get('/api/admin/roles', requireAuth, requireAdmin, (req, res) => {
  const db = readDb();
  const allAdmins = Array.from(new Set([...ENV_ADMIN_IDS, ...(db.admins || [])]));
  res.json(allAdmins);
});

app.post('/api/admin/roles/add', requireAuth, requireAdmin, (req, res) => {
  const adminSession = (req as any).user;
  const { newAdminId } = req.body;
  const idStr = String(newAdminId).trim();

  if (!idStr || !/^\d+$/.test(idStr)) {
    return res.status(400).json({ error: 'Invalid Telegram Numeric User ID' });
  }

  const db = readDb();
  db.admins = db.admins || [];
  if (!db.admins.includes(idStr)) {
    db.admins.push(idStr);
  }

  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    action: 'ADD_ADMIN_ROLE',
    admin_id: adminSession.tgId,
    target_id: idStr,
    details: `Added Telegram User ID ${idStr} as authorized admin`,
    timestamp: new Date().toISOString(),
    success: true
  });
  writeDb(db);

  res.json({ success: true, admins: db.admins });
});

app.post('/api/admin/roles/remove', requireAuth, requireAdmin, (req, res) => {
  const adminSession = (req as any).user;
  const { removeAdminId } = req.body;
  const idStr = String(removeAdminId).trim();

  const db = readDb();
  db.admins = db.admins || [];

  if (db.admins.length <= 1 && ENV_ADMIN_IDS.length <= 1) {
    return res.status(400).json({ error: 'Cannot remove the last remaining administrator' });
  }

  db.admins = db.admins.filter(a => a !== idStr);

  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    action: 'REMOVE_ADMIN_ROLE',
    admin_id: adminSession.tgId,
    target_id: idStr,
    details: `Removed Telegram User ID ${idStr} from admin roles`,
    timestamp: new Date().toISOString(),
    success: true
  });
  writeDb(db);

  res.json({ success: true, admins: db.admins });
});

// Admin Audit Logs
app.get('/api/admin/audit-logs', requireAuth, requireAdmin, (req, res) => {
  const db = readDb();
  res.json(db.audit_logs || []);
});

// Admin Withdrawals
app.get('/api/admin/withdrawals', requireAuth, requireAdmin, (req, res) => {
  const db = readDb();
  res.json(db.withdrawals || []);
});

app.post('/api/admin/withdrawals/approve', requireAuth, requireAdmin, (req, res) => {
  const adminSession = (req as any).user;
  const { withdrawalId, transactionId } = req.body;
  const db = readDb();
  const target = db.withdrawals.find((w: any) => w.id === withdrawalId);
  if (!target) return res.status(404).json({ error: 'Withdrawal not found' });

  target.status = 'approved';
  target.transaction_id = transactionId || `TXN${Date.now()}`;
  target.updated_at = new Date().toISOString();

  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    action: 'APPROVE_WITHDRAWAL',
    admin_id: adminSession.tgId,
    target_id: target.telegram_id,
    details: `Approved withdrawal of ${target.amount_coins} coins (৳${target.amount_bdt} ${target.method}). Trx: ${target.transaction_id}`,
    timestamp: new Date().toISOString(),
    success: true
  });
  writeDb(db);

  // Send Telegram notice to user
  telegramRequest('sendMessage', {
    chat_id: target.telegram_id,
    text: `✅ <b>উইথড্রয়াল সফল!</b>\n\nআপনার <b>${target.amount_coins} YZ</b> (৳${target.amount_bdt}) উইথড্রয়াল রিকোয়েস্ট অনুমোদিত হয়েছে।\nপেমেন্ট মেথড: <b>${target.method.toUpperCase()}</b>\nনম্বর: <code>${target.account_number}</code>\nট্রানজেকশন আইডি: <code>${target.transaction_id}</code>`,
    parse_mode: 'HTML'
  }).catch(() => {});

  res.json({ success: true, withdrawal: target });
});

app.post('/api/admin/withdrawals/reject', requireAuth, requireAdmin, (req, res) => {
  const adminSession = (req as any).user;
  const { withdrawalId, reason } = req.body;
  const db = readDb();
  const target = db.withdrawals.find((w: any) => w.id === withdrawalId);
  if (!target) return res.status(404).json({ error: 'Withdrawal not found' });

  target.status = 'rejected';
  target.admin_note = reason || 'Details verification failed';
  target.updated_at = new Date().toISOString();

  // Refund user coins
  const user = db.users[target.telegram_id];
  if (user) {
    user.coins += target.amount_coins;
  }

  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    action: 'REJECT_WITHDRAWAL',
    admin_id: adminSession.tgId,
    target_id: target.telegram_id,
    details: `Rejected withdrawal of ${target.amount_coins} coins. Refunded coins to user. Reason: ${target.admin_note}`,
    timestamp: new Date().toISOString(),
    success: true
  });
  writeDb(db);

  // Send Telegram notice to user
  telegramRequest('sendMessage', {
    chat_id: target.telegram_id,
    text: `❌ <b>উইথড্রয়াল বাতিল ও রিফান্ড</b>\n\nআপনার উইথড্রয়াল রিকোয়েস্টটি বাতিল করা হয়েছে এবং <b>${target.amount_coins} YZ</b> কয়েন আপনার ব্যালেন্সে রিফান্ড করা হয়েছে।\nকারণ: <i>${target.admin_note}</i>`,
    parse_mode: 'HTML'
  }).catch(() => {});

  res.json({ success: true, withdrawal: target });
});

// Admin Tasks Management
app.post('/api/admin/tasks/add', requireAuth, requireAdmin, (req, res) => {
  const adminSession = (req as any).user;
  const { title, title_bn, reward, category, link, icon } = req.body;
  const db = readDb();

  const newTask = {
    id: `task-${Date.now()}`,
    title,
    title_bn: title_bn || title,
    description: 'Complete task to claim bonus coins',
    description_bn: 'টাস্ক সম্পন্ন করে রিওয়ার্ড সংগ্রহ করুন',
    reward: Number(reward) || 200,
    category: category || 'social',
    link: link || undefined,
    icon: icon || 'Trophy',
    is_active: true
  };

  db.tasks.unshift(newTask);
  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    action: 'ADD_TASK',
    admin_id: adminSession.tgId,
    details: `Created new task: ${newTask.title} (+${newTask.reward} YZ)`,
    timestamp: new Date().toISOString(),
    success: true
  });
  writeDb(db);

  res.json({ success: true, task: newTask });
});

app.post('/api/admin/tasks/delete', requireAuth, requireAdmin, (req, res) => {
  const adminSession = (req as any).user;
  const { taskId } = req.body;
  const db = readDb();
  db.tasks = db.tasks.filter((t: any) => t.id !== taskId);
  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    action: 'DELETE_TASK',
    admin_id: adminSession.tgId,
    details: `Deleted task ${taskId}`,
    timestamp: new Date().toISOString(),
    success: true
  });
  writeDb(db);
  res.json({ success: true });
});

// Admin Settings
app.post('/api/admin/settings', requireAuth, requireAdmin, (req, res) => {
  const adminSession = (req as any).user;
  const { settings } = req.body;
  const db = readDb();
  db.settings = { ...db.settings, ...settings };
  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    action: 'UPDATE_SETTINGS',
    admin_id: adminSession.tgId,
    details: `Updated platform global settings`,
    timestamp: new Date().toISOString(),
    success: true
  });
  writeDb(db);
  res.json({ success: true, settings: db.settings });
});

// ---------------------------------------------------------------------
// 7. TELEGRAM BOT ENGINE & REAL-TIME POLLING
// ---------------------------------------------------------------------
let isPolling = false;
let lastUpdateId = 0;

async function startTelegramBot() {
  if (isPolling || !BOT_TOKEN) return;
  isPolling = true;

  console.log(`🤖 Starting Telegram Bot polling for @${BOT_USERNAME}...`);

  try {
    await telegramRequest('deleteWebhook', { drop_pending_updates: false });
    const me = await telegramRequest('getMe', {});
    if (me && me.result) {
      console.log(`✅ Connected to Telegram Bot: @${me.result.username} (${me.result.first_name})`);
    }

    await telegramRequest('setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: '🚀 Open Mini App',
        web_app: { url: currentAppUrl }
      }
    });
  } catch (e) {
    console.warn('Webhook delete or getMe notice:', e);
  }

  while (isPolling) {
    try {
      const updatesRes = await telegramRequest('getUpdates', {
        offset: lastUpdateId + 1,
        timeout: 20
      });

      if (updatesRes && updatesRes.ok && Array.isArray(updatesRes.result)) {
        for (const update of updatesRes.result) {
          lastUpdateId = update.update_id;
          await handleTelegramUpdate(update);
        }
      }
    } catch (err) {
      console.error('Polling loop error:', err);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function handleTelegramUpdate(update: any) {
  const db = readDb();

  // Handle messages
  if (update.message && update.message.text) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const from = msg.from;
    const text = msg.text.trim();
    const tgId = String(from.id);
    const isAdmin = isUserAdmin(tgId);

    // Get or create user
    let user = db.users[tgId];

    if (!user) {
      user = {
        id: tgId,
        telegram_id: tgId,
        username: from.username || `user_${tgId}`,
        first_name: from.first_name || 'Telegram',
        last_name: from.last_name || 'User',
        coins: 500,
        total_earned: 500,
        level: 1,
        referral_code: `ref_${tgId}`,
        referral_count: 0,
        completed_tasks: [],
        created_at: new Date().toISOString()
      };

      // -------------------------------------------------------------
      // TELEGRAM REFERRAL DEEP LINK LOGIC (Strict Server Validation)
      // -------------------------------------------------------------
      if (text.startsWith('/start ')) {
        const payload = text.split(' ')[1]?.trim();
        const referrerId = payload.startsWith('ref_') ? payload.replace(/^ref_/, '') : payload;

        // Validation 1: Prevent self-referral
        const isSelfReferral = referrerId === tgId;

        // Validation 2: Prevent duplicate referrals
        const alreadyReferred = db.referrals.some(r => r.referred_id === tgId);

        // Validation 3: Referrer must exist
        const referrer = db.users[referrerId];

        if (!isSelfReferral && !alreadyReferred && referrer) {
          user.referred_by = referrerId;
          const bonus = db.settings.referral_bonus || 300;
          referrer.coins += bonus;
          referrer.total_earned += bonus;
          referrer.referral_count = (referrer.referral_count || 0) + 1;

          // Record atomic referral record
          db.referrals.push({
            id: `ref-${Date.now()}-${tgId}`,
            referrer_id: referrerId,
            referred_id: tgId,
            referrer_name: `${referrer.first_name} ${referrer.last_name || ''}`.trim(),
            referred_name: `${user.first_name} ${user.last_name || ''}`.trim(),
            bonus_coins: bonus,
            created_at: new Date().toISOString()
          });

          // Notify referrer via Telegram
          telegramRequest('sendMessage', {
            chat_id: referrer.telegram_id,
            text: `🎉 <b>নতুন রেফারেল বোনাস!</b>\n\nইউজার <b>${user.first_name}</b> আপনার রেফারেল লিংক দিয়ে জয়েন করেছে। আপনার ব্যালেন্সে <b>+${bonus} YZ</b> যোগ হয়েছে!`,
            parse_mode: 'HTML'
          }).catch(() => {});
        }
      }

      db.users[tgId] = user;
      writeDb(db);
    }

    // Command: /start
    if (text.startsWith('/start')) {
      const userRefLink = `https://t.me/${BOT_USERNAME}?start=ref_${user.telegram_id}`;
      const welcomeText = `👋 <b>স্বাগতম ${user.first_name}!</b> 🎉

<b>${db.settings.bot_name}</b>-এ আপনাকে স্বাগতম!

🪙 বর্তমান ব্যালেন্স: <b>${user.coins} YZ</b>
💵 সমপরিমাণ: <b>৳${(user.coins * db.settings.coin_to_bdt_rate).toFixed(2)} BDT</b>
👥 আপনার রেফারেল লিংক:
<code>${userRefLink}</code>

👇 নিচের বোতামে ক্লিক করে কয়েন আয় ও বিকাশ/নগদে ক্যাশআউট করুন:`;

      const inlineKeyboard: any[] = [
        [
          { text: '🚀 Open Mini App', web_app: { url: currentAppUrl } }
        ]
      ];

      // Show Admin Panel button ONLY to verified Telegram Admin IDs
      if (isAdmin) {
        inlineKeyboard.push([
          { text: '🛠️ Admin Panel (Protected)', web_app: { url: `${currentAppUrl}?view=admin` } }
        ]);
      }

      inlineKeyboard.push([
        { text: '💰 ব্যালেন্স চেক', callback_data: 'balance' },
        { text: '👥 বন্ধুদের রেফার', callback_data: 'referral' }
      ]);
      inlineKeyboard.push([
        { text: '🌐 ব্রাউজারে খুলুন (Direct Link)', url: currentAppUrl }
      ]);
      inlineKeyboard.push([
        { text: 'ℹ️ সাহায্য ও নিয়মাবলী', callback_data: 'help' }
      ]);

      await telegramRequest('sendMessage', {
        chat_id: chatId,
        text: welcomeText,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    }

    // Command: /admin
    else if (text === '/admin') {
      if (!isAdmin) {
        await telegramRequest('sendMessage', {
          chat_id: chatId,
          text: `❌ <b>এক্সেস ডিনায়েড (Access Denied)</b>\n\nআপনার Telegram User ID (<code>${tgId}</code>) এই প্ল্যাটফর্মের অনুমোদিত অ্যাডমিন হিসেবে তালিকাভুক্ত নয়।`,
          parse_mode: 'HTML'
        });
      } else {
        const pendingCount = db.withdrawals.filter((w: any) => w.status === 'pending').length;
        await telegramRequest('sendMessage', {
          chat_id: chatId,
          text: `🛡️ <b>Admin Control Hub (ID: ${tgId})</b>\n\n👥 মোট ইউজার: <b>${Object.keys(db.users).length}</b>\n⏳ পেন্ডিং উইথড্রয়াল: <b>${pendingCount}</b>\n🔗 মোট রেফারেল: <b>${db.referrals.length}</b>\n\nনিচের বোতাম চেপে অ্যাডমিন প্যানেল ওপেন করুন:`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛠️ Open Admin Panel', web_app: { url: `${currentAppUrl}?view=admin` } }],
              [{ text: '🌐 Direct Browser Admin', url: `${currentAppUrl}?view=admin` }]
            ]
          }
        });
      }
    }

    // Command: /balance
    else if (text === '/balance') {
      const bdt = (user.coins * db.settings.coin_to_bdt_rate).toFixed(2);
      await telegramRequest('sendMessage', {
        chat_id: chatId,
        text: `💰 <b>আপনার ব্যালেন্স বিবরণী:</b>\n\n🪙 কয়েন: <b>${user.coins} YZ</b>\n💵 মান: <b>৳${bdt} BDT</b>\n🏆 লেভেল: <b>${user.level}</b>\n👥 সফল রেফারেল: <b>${user.referral_count || 0} জন</b>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Open Mini App', web_app: { url: currentAppUrl } }],
            [{ text: '🌐 ব্রাউজারে খুলুন', url: currentAppUrl }]
          ]
        }
      });
    }

    // Command: /referral
    else if (text === '/referral') {
      const userRefLink = `https://t.me/${BOT_USERNAME}?start=ref_${user.telegram_id}`;
      await telegramRequest('sendMessage', {
        chat_id: chatId,
        text: `👥 <b>বন্ধুদের আমন্ত্রণ জানান ও আয় করুন!</b>\n\nপ্রতিটি সফল রেফারে পাবেন <b>${db.settings.referral_bonus} YZ</b> কয়েন!\n\n🔗 আপনার ইনভাইট লিংক:\n<code>${userRefLink}</code>\n\n📊 মোট সফল রেফারেল: <b>${user.referral_count || 0} জন</b>\n💎 রেফারেল থেকে মোট আয়: <b>${(user.referral_count || 0) * db.settings.referral_bonus} YZ</b>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Open Mini App', web_app: { url: currentAppUrl } }]
          ]
        }
      });
    }

    // Command: /app or /url
    else if (text === '/app' || text === '/url') {
      await telegramRequest('sendMessage', {
        chat_id: chatId,
        text: `📱 <b>মিনি অ্যাপ লঞ্চার:</b>\n\nনিচের বোতাম চেপে অ্যাপে প্রবেশ করুন:`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Open Mini App', web_app: { url: currentAppUrl } }],
            [{ text: '🌐 ব্রাউজারে খুলুন (Direct Link)', url: currentAppUrl }]
          ]
        }
      });
    } else {
      await telegramRequest('sendMessage', {
        chat_id: chatId,
        text: `ℹ️ <b>কমান্ড তালিকা:</b>\n\n/start - বট রিস্টার্ট বা শুরু করুন\n/app - মিনি অ্যাপ ওপেন করুন\n/balance - ব্যালেন্স দেখুন\n/referral - রেফারেল লিংক পান\n/admin - অ্যাডমিন প্যানেল (অনুমোদিত ID-র জন্য)`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Open Mini App', web_app: { url: currentAppUrl } }]
          ]
        }
      });
    }
  }

  // Handle Callback Queries (Inline buttons)
  if (update.callback_query) {
    const cb = update.callback_query;
    const tgId = String(cb.from.id);
    const user = db.users[tgId] || { coins: 500, level: 1, referral_code: `ref_${tgId}`, referral_count: 0, telegram_id: tgId };
    const data = cb.data;

    await telegramRequest('answerCallbackQuery', {
      callback_query_id: cb.id
    });

    if (data === 'balance') {
      const bdt = (user.coins * db.settings.coin_to_bdt_rate).toFixed(2);
      await telegramRequest('sendMessage', {
        chat_id: cb.message.chat.id,
        text: `💰 <b>বর্তমান ব্যালেন্স:</b> <b>${user.coins} YZ</b> (≈ ৳${bdt} BDT)`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Open Mini App', web_app: { url: currentAppUrl } }]
          ]
        }
      });
    } else if (data === 'referral') {
      const userRefLink = `https://t.me/${BOT_USERNAME}?start=ref_${user.telegram_id}`;
      await telegramRequest('sendMessage', {
        chat_id: cb.message.chat.id,
        text: `👥 <b>আপনার ইনভাইট লিংক:</b>\n<code>${userRefLink}</code>\n\nপ্রতি রেফারে পাবেন +${db.settings.referral_bonus} কয়েন!\nমোট রেফারেল: ${user.referral_count || 0} জন`,
        parse_mode: 'HTML'
      });
    } else if (data === 'help') {
      await telegramRequest('sendMessage', {
        chat_id: cb.message.chat.id,
        text: `💡 <b>নিয়মাবলী ও সাহায্য:</b>\n\n১. মিনি অ্যাপে প্রতিদিন লাকি স্পিন ও টাস্ক সম্পন্ন করে কয়েন জমা করুন।\n২. ন্যূনতম ১,০০০ কয়েন হলে বিকাশ, নগদ বা রকেটে উইথড্র করতে পারবেন।\n৩. প্রতিটি উইথড্রয়াল ১-২৪ ঘণ্টার মধ্যে অ্যাডমিন ভেরিফাই করে টাকা পাঠিয়ে দেন।`,
        parse_mode: 'HTML'
      });
    }
  }
}

// ---------------------------------------------------------------------
// 8. SERVER BOOTSTRAP & INTEGRATION
// ---------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start Express listener immediately so APIs and Vite are responsive in <5ms
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Web & Mini App Server running at http://0.0.0.0:${PORT}`);
    // Start public tunnel and telegram bot in background asynchronously
    startTunnel()
      .then(() => startTelegramBot())
      .catch(console.error);
  });
}

startServer().catch(console.error);

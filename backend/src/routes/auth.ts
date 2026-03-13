import bcrypt from 'bcryptjs';
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import db from '../db';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? 'fenceai-dev-secret-change-in-production';
const SALT_ROUNDS = 10;

type UserRow = { id: number; email: string; password_hash: string; name: string | null; created_at: string };

function toUser(row: UserRow) {
  return { id: String(row.id), email: row.email, name: row.name ?? row.email };
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // treat leading 8 as 7 for RU-style numbers
  const normalized = digits.startsWith('8') ? `7${digits.slice(1)}` : digits;
  return `+${normalized}`;
}

function generateCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

function generateQrCode(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** POST /api/auth/register — регистрация */
router.post('/register', (req: Request, res: Response) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Нужны email и password' });
  }
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) return res.status(400).json({ error: 'Email не может быть пустым' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль не менее 6 символов' });

  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  try {
    const stmt = db.prepare(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
    );
    const result = stmt.run(trimmedEmail, passwordHash, name?.trim() || null);
    const row = db.prepare('SELECT id, email, password_hash, name, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as UserRow;
    const token = jwt.sign({ userId: row.id }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: toUser(row) });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Такой email уже зарегистрирован' });
    }
    throw e;
  }
});

/** POST /api/auth/login — вход */
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Нужны email и password' });
  }
  const trimmedEmail = email.trim().toLowerCase();
  const row = db.prepare('SELECT id, email, password_hash, name, created_at FROM users WHERE email = ?').get(trimmedEmail) as UserRow | undefined;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  const token = jwt.sign({ userId: row.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: toUser(row) });
});

/** POST /api/auth/send-sms-code — отправить код подтверждения на телефон */
router.post('/send-sms-code', (req: Request, res: Response) => {
  const { phone } = req.body as { phone?: string };
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'Номер телефона обязателен' });
  }
  const normalized = normalizePhone(phone);
  if (!normalized) return res.status(400).json({ error: 'Некорректный номер телефона' });

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 минут

  db.prepare(
    'INSERT INTO phone_verifications (phone, code, expires_at) VALUES (?, ?, ?)'
  ).run(normalized, code, expiresAt);

  // Здесь должна быть реальная отправка SMS через провайдера (Twilio, etc.).
  // Пока что просто логируем код в консоль для dev-сборки.
  console.log(`[sms] Код для ${normalized}: ${code}`);

  res.json({ ok: true });
});

/** POST /api/auth/verify-sms-code — проверить код подтверждения */
router.post('/verify-sms-code', (req: Request, res: Response) => {
  const { phone, code } = req.body as { phone?: string; code?: string };
  if (!phone || typeof phone !== 'string' || !code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Нужны номер телефона и код' });
  }
  const normalized = normalizePhone(phone);
  const digitsCode = code.replace(/\D/g, '');
  if (!normalized || !digitsCode) {
    return res.status(400).json({ error: 'Некорректные номер телефона или код' });
  }

  const row = db
    .prepare(
      'SELECT phone, code, expires_at FROM phone_verifications WHERE phone = ? ORDER BY created_at DESC LIMIT 1'
    )
    .get(normalized) as { phone: string; code: string; expires_at: string } | undefined;

  if (!row) return res.status(400).json({ error: 'Код не найден, запросите новый' });

  const now = Date.now();
  const expiresMs = Date.parse(row.expires_at);
  if (Number.isFinite(expiresMs) && expiresMs < now) {
    return res.status(400).json({ error: 'Срок действия кода истёк' });
  }

  if (row.code !== digitsCode) {
    return res.status(400).json({ error: 'Неверный код' });
  }

  return res.json({ ok: true });
});

/** POST /api/auth/qr/create — создать одноразовый QR-код для входа в этот аккаунт */
router.post('/qr/create', requireAuth, (req: AuthedRequest, res: Response) => {
  const userId = req.userId;
  const code = generateQrCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 минут на сканирование

  db.prepare(
    'INSERT INTO qr_login_tokens (user_id, code, expires_at) VALUES (?, ?, ?)'
  ).run(userId, code, expiresAt);

  res.json({ code, expiresAt });
});

/** POST /api/auth/qr/consume — войти по QR-коду (на новом устройстве) */
router.post('/qr/consume', (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Нужен код' });
  }

  const row = db
    .prepare(
      `SELECT q.user_id, q.code, q.expires_at, q.used_at, u.email, u.password_hash, u.name, u.created_at, u.id
       FROM qr_login_tokens q
       JOIN users u ON u.id = q.user_id
       WHERE q.code = ?
       ORDER BY q.created_at DESC
       LIMIT 1`
    )
    .get(code) as (UserRow & {
    code: string;
    expires_at: string;
    used_at: string | null;
  }) | undefined;

  if (!row) return res.status(400).json({ error: 'Код не найден' });

  const now = Date.now();
  const expiresMs = Date.parse(row.expires_at);
  if (Number.isFinite(expiresMs) && expiresMs < now) {
    return res.status(400).json({ error: 'Срок действия кода истёк' });
  }
  if (row.used_at) {
    return res.status(400).json({ error: 'Код уже использован' });
  }

  db.prepare('UPDATE qr_login_tokens SET used_at = datetime(\'now\') WHERE code = ?').run(code);

  const token = jwt.sign({ userId: row.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: toUser(row) });
});

/** GET /api/auth/qr/image/:code — PNG с QR по одноразовому коду */
router.get('/qr/image/:code', async (req: Request, res: Response) => {
  const code = req.params.code;
  if (!code) return res.status(400).json({ error: 'Нужен код' });

  const row = db
    .prepare(
      'SELECT code, expires_at, used_at FROM qr_login_tokens WHERE code = ? ORDER BY created_at DESC LIMIT 1'
    )
    .get(code) as { code: string; expires_at: string; used_at: string | null } | undefined;

  if (!row) return res.status(404).json({ error: 'Код не найден' });

  const now = Date.now();
  const expiresMs = Date.parse(row.expires_at);
  if (Number.isFinite(expiresMs) && expiresMs < now) {
    return res.status(400).json({ error: 'Срок действия кода истёк' });
  }

  try {
    const png = await QRCode.toBuffer(code, {
      type: 'png',
      margin: 0,
      width: 256,
      color: {
        dark: '#000000',
        light: '#F1F4F9',
      },
    });
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  } catch (e) {
    console.error('QR image generation failed', e);
    res.status(500).json({ error: 'Не удалось сгенерировать QR' });
  }
});

export default router;

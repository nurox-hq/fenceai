import { Router, Response } from 'express';

import db from '../db';
import type { AuthedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';

const router = Router();

type ProjectRow = {
  id: number;
  user_id: number;
  address: string;
  status: 'active' | 'done';
  date_start: string | null;
  date_end: string | null;
  start_date_ymd: string | null;
  end_date_ymd: string | null;
  cover_image_uri: string | null;
  plan_image_uri: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  created_at: string;
};

function rowToJson(row: ProjectRow) {
  return {
    id: String(row.id),
    address: row.address,
    status: row.status,
    dateStart: row.date_start,
    dateEnd: row.date_end,
    startDateYmd: row.start_date_ymd,
    endDateYmd: row.end_date_ymd,
    coverImageUri: row.cover_image_uri,
    planImageUri: row.plan_image_uri,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientEmail: row.client_email,
    createdAt: row.created_at,
  };
}

/** GET /api/projects — список проектов текущего пользователя */
router.get('/', requireAuth, (req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare<ProjectRow>(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC, id DESC'
    )
    .all(req.userId) as ProjectRow[];
  res.json({ projects: rows.map(rowToJson) });
});

/** POST /api/projects — создать проект для текущего пользователя */
router.post('/', requireAuth, (req: AuthedRequest, res: Response) => {
  const {
    address,
    status,
    dateStart,
    dateEnd,
    startDateYmd,
    endDateYmd,
    coverImageUri,
    planImageUri,
    clientName,
    clientPhone,
    clientEmail,
  } = req.body as {
    address?: string;
    status?: 'active' | 'done';
    dateStart?: string | null;
    dateEnd?: string | null;
    startDateYmd?: string | null;
    endDateYmd?: string | null;
    coverImageUri?: string | null;
    planImageUri?: string | null;
    clientName?: string | null;
    clientPhone?: string | null;
    clientEmail?: string | null;
  };

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'address is required' });
  }
  const st = status === 'done' ? 'done' : 'active';

  const stmt = db.prepare(
    `INSERT INTO projects
    (user_id, address, status, date_start, date_end, start_date_ymd, end_date_ymd,
     cover_image_uri, plan_image_uri, client_name, client_phone, client_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const result = stmt.run(
    req.userId,
    address.trim(),
    st,
    dateStart ?? null,
    dateEnd ?? null,
    startDateYmd ?? null,
    endDateYmd ?? null,
    coverImageUri ?? null,
    planImageUri ?? null,
    clientName ?? null,
    clientPhone ?? null,
    clientEmail ?? null
  );

  const row = db
    .prepare<ProjectRow>('SELECT * FROM projects WHERE id = ?')
    .get(result.lastInsertRowid) as ProjectRow;

  res.status(201).json(rowToJson(row));
});

export default router;


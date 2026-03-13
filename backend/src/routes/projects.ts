import { Router, Request, Response } from 'express';

import {
  listProjectsForUser,
  insertProject,
  type ProjectRow,
} from '../db';
import type { AuthedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';

const router = Router();

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
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;
  const rows = await listProjectsForUser(userId);
  return res.json({ projects: rows.map(rowToJson) });
});

/** POST /api/projects — создать проект для текущего пользователя */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;
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

  const row = await insertProject(userId, {
    address: address.trim(),
    status: st,
    dateStart: dateStart ?? null,
    dateEnd: dateEnd ?? null,
    startDateYmd: startDateYmd ?? null,
    endDateYmd: endDateYmd ?? null,
    coverImageUri: coverImageUri ?? null,
    planImageUri: planImageUri ?? null,
    clientName: clientName ?? null,
    clientPhone: clientPhone ?? null,
    clientEmail: clientEmail ?? null,
  });

  return res.status(201).json(rowToJson(row));
});

export default router;


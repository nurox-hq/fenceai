import { Router, Request, Response } from 'express';
import {
  getAllMapObjects,
  getMapObjectById,
  createMapObject,
  updateMapObject,
  deleteMapObject,
} from '../store';
import type { CreateMapObjectBody, UpdateMapObjectBody } from '../types';

const router = Router();

/** Список всех объектов на карте (опционально ?status=active|done) */
router.get('/objects', (req: Request, res: Response) => {
  const status = req.query.status as 'active' | 'done' | undefined;
  if (status && status !== 'active' && status !== 'done') {
    return res.status(400).json({ error: 'status must be active or done' });
  }
  const list = getAllMapObjects(status);
  res.json({ objects: list });
});

/** Один объект по id */
router.get('/objects/:id', (req: Request, res: Response) => {
  const obj = getMapObjectById(req.params.id);
  if (!obj) return res.status(404).json({ error: 'Not found' });
  res.json(obj);
});

/** Создать объект на карте */
router.post('/objects', (req: Request, res: Response) => {
  const body = req.body as CreateMapObjectBody;
  if (
    typeof body.address !== 'string' ||
    typeof body.lat !== 'number' ||
    typeof body.lng !== 'number'
  ) {
    return res
      .status(400)
      .json({ error: 'address (string), lat (number), lng (number) required' });
  }
  const obj = createMapObject({
    projectId: body.projectId,
    address: body.address,
    lat: body.lat,
    lng: body.lng,
    status: body.status,
  });
  res.status(201).json(obj);
});

/** Обновить объект */
router.patch('/objects/:id', (req: Request, res: Response) => {
  const body = req.body as UpdateMapObjectBody;
  const obj = updateMapObject(req.params.id, {
    address: body.address,
    lat: body.lat,
    lng: body.lng,
    status: body.status,
  });
  if (!obj) return res.status(404).json({ error: 'Not found' });
  res.json(obj);
});

/** Удалить объект */
router.delete('/objects/:id', (req: Request, res: Response) => {
  const ok = deleteMapObject(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;

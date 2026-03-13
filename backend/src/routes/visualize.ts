import { Router, Request, Response } from 'express';

import db from '../db';
import type { AuthedRequest } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';

const router = Router();

type VisualizeBody = {
  imageBase64?: string;
  imageUrl?: string;
  referenceImageBase64?: string | null;
  referenceImageUrl?: string | null;
  features?: Record<string, unknown>;
  prompt?: string;
  projectId?: string | null;
};

const GENAPI_URL = process.env.GENAPI_VISUALIZE_URL;

/** POST /api/visualize — создать визуализацию для проекта/пользователя */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const {
    imageBase64,
    imageUrl,
    referenceImageBase64,
    referenceImageUrl,
    features,
    prompt,
    projectId,
  } = req.body as VisualizeBody;

  const { userId } = req as AuthedRequest;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt обязателен' });
  }
  if (!imageBase64 && !imageUrl) {
    return res
      .status(400)
      .json({ error: 'Нужно передать imageBase64 или imageUrl' });
  }

  const safeFeatures =
    features && typeof features === 'object' ? features : undefined;

  let result: unknown;

  if (GENAPI_URL) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      const resp = await fetch(GENAPI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data: imageBase64,
          image_url: imageUrl,
          reference_image_data: referenceImageBase64,
          reference_image_url: referenceImageUrl,
          features: safeFeatures,
          user_prompt: prompt,
          user_id: userId,
          project_id: projectId ?? null,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        const text = await resp.text();
        console.error('GenAPI visualize error:', resp.status, text);
        return res
          .status(502)
          .json({ error: 'Сервис визуализации недоступен' });
      }
      result = await resp.json();
    } catch (e) {
      console.error('GenAPI visualize exception', e);
      return res
        .status(502)
        .json({ error: 'Ошибка при обращении к сервису визуализации' });
    }
  } else {
    // DEV-режим: stub‑ответ, чтобы фронт уже мог работать сегодня.
    result = {
      stub: true,
      message:
        'GENAPI_VISUALIZE_URL не настроен, возвращён заглушечный ответ визуализации.',
      echo: {
        prompt,
        hasImageBase64: Boolean(imageBase64),
        imageUrl,
        features: safeFeatures,
      },
    };
  }

  // TODO: при необходимости можно сохранять ссылку на результат визуализации в projects
  // через отдельную таблицу или поле.

  return res.json({
    ok: true,
    visualization: result,
  });
});

export default router;


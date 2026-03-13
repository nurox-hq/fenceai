import { Request, Response, Router } from 'express';
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
const GENAPI_MODEL_ID = process.env.GENAPI_MODEL_ID_VISUALIZATION;
const GENAPI_API_KEY = process.env.GENAPI_API_KEY;

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

  if (GENAPI_URL && GENAPI_MODEL_ID) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      const composedPrompt = `
Create visualization based on:
User prompt: ${prompt}
Extracted features: ${JSON.stringify(safeFeatures ?? {}, null, 2)}
`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (GENAPI_API_KEY) {
        headers.Authorization = `Bearer ${GENAPI_API_KEY}`;
      }

      const resp = await fetch(GENAPI_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model_id: GENAPI_MODEL_ID,
          prompt: composedPrompt,
          image_data: imageBase64,
          reference_image_data: referenceImageBase64,
          // Дополнительные поля, которые может использовать внешний сервис
          features: safeFeatures,
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
        'Сервис визуализации не настроен (GENAPI_VISUALIZE_URL или GENAPI_MODEL_ID_VISUALIZATION). Возвращён заглушечный ответ.',
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
    visualization: {
      visualized: true,
      visualization_result: result,
      features: safeFeatures,
    },
  });
});

export default router;


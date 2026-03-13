# FENCEAI Backend

Сервер API: авторизация, карта объектов, погода (прокси).

## Запуск

```bash
cd backend
npm install
npm run dev
```

Сервер будет доступен по адресу `http://localhost:3001`. База SQLite создаётся в `backend/data/fenceai.db` (папка создаётся автоматически).

## База данных

- **SQLite** (файл `data/fenceai.db`). Таблица `users`: id, email (уникальный), password_hash, name, created_at.
- Для продакшена можно задать путь: `DB_PATH=/path/to/db.sqlite`, секрет JWT: `JWT_SECRET=your-secret`.

## API

### Проверка работы
- `GET /health` — ответ `{ "ok": true, "service": "fenceai-backend" }`

### Авторизация
- `POST /api/auth/register` — тело: `{ "email": "...", "password": "...", "name": "..." }` (name необязателен). Ответ: `{ "token": "...", "user": { "id", "email", "name" } }`.
- `POST /api/auth/login` — тело: `{ "email": "...", "password": "..." }`. Ответ: `{ "token": "...", "user": { "id", "email", "name" } }`.

### Погода

- `GET /api/weather?lat=55.75&lng=37.62` — текущая погода по координатам (прокси к Open-Meteo). Ответ: температура, ощущаемая, влажность, код погоды (WMO), скорость ветра (км/ч), направление ветра (градусы 0–360, откуда дует), порывы (км/ч).

### Карта объектов

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/map/objects` | Список всех объектов. Query: `?status=active` или `?status=done` |
| GET | `/api/map/objects/:id` | Один объект по id |
| POST | `/api/map/objects` | Создать объект (body: `address`, `lat`, `lng`, опционально `projectId`, `status`) |
| PATCH | `/api/map/objects/:id` | Обновить объект |
| DELETE | `/api/map/objects/:id` | Удалить объект |

**Тело POST /api/map/objects:**
```json
{
  "address": "ул. Ленина, 12",
  "lat": 55.7558,
  "lng": 37.6173,
  "projectId": "1",
  "status": "active"
}
```

Данные хранятся в памяти (при перезапуске сбрасываются к начальному набору из 4 объектов).

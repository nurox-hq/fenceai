import type { MapObject, MapObjectStatus } from './types';

const now = () => new Date().toISOString();

const initialObjects: MapObject[] = [
  {
    id: '1',
    projectId: '1',
    address: 'ул. Ленина, 12',
    lat: 55.7558,
    lng: 37.6173,
    status: 'active',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: '2',
    projectId: '2',
    address: 'Дача Петровых',
    lat: 55.7612,
    lng: 37.6145,
    status: 'active',
    createdAt: '2026-03-02T10:00:00.000Z',
    updatedAt: '2026-03-02T10:00:00.000Z',
  },
  {
    id: '3',
    projectId: '3',
    address: 'Коттедж Сидорова',
    lat: 55.7489,
    lng: 37.6201,
    status: 'done',
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-28T10:00:00.000Z',
  },
  {
    id: '4',
    projectId: '4',
    address: 'ул. Мира, 5',
    lat: 55.7522,
    lng: 37.6089,
    status: 'done',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
  },
];

const objects = new Map<string, MapObject>(
  initialObjects.map((o) => [o.id, o])
);

let nextId = 5;

function nextIdStr(): string {
  return String(nextId++);
}

export function getAllMapObjects(status?: 'active' | 'done'): MapObject[] {
  const list = Array.from(objects.values());
  if (status) return list.filter((o) => o.status === status);
  return list;
}

export function getMapObjectById(id: string): MapObject | undefined {
  return objects.get(id);
}

export function createMapObject(body: {
  projectId?: string | null;
  address: string;
  lat: number;
  lng: number;
  status?: MapObjectStatus;
}): MapObject {
  const id = nextIdStr();
  const createdAt = now();
  const obj: MapObject = {
    id,
    projectId: body.projectId ?? null,
    address: body.address,
    lat: body.lat,
    lng: body.lng,
    status: body.status ?? 'active',
    createdAt,
    updatedAt: createdAt,
  };
  objects.set(id, obj);
  return obj;
}

export function updateMapObject(
  id: string,
  body: { address?: string; lat?: number; lng?: number; status?: MapObjectStatus }
): MapObject | undefined {
  const obj = objects.get(id);
  if (!obj) return undefined;
  if (body.address !== undefined) obj.address = body.address;
  if (body.lat !== undefined) obj.lat = body.lat;
  if (body.lng !== undefined) obj.lng = body.lng;
  if (body.status !== undefined) obj.status = body.status;
  obj.updatedAt = now();
  return obj;
}

export function deleteMapObject(id: string): boolean {
  return objects.delete(id);
}

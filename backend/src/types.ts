export type MapObjectStatus = 'active' | 'done';

export interface MapObject {
  id: string;
  projectId: string | null;
  address: string;
  lat: number;
  lng: number;
  status: MapObjectStatus;
  createdAt: string; // ISO
  updatedAt: string;
}

export interface CreateMapObjectBody {
  projectId?: string | null;
  address: string;
  lat: number;
  lng: number;
  status?: MapObjectStatus;
}

export interface UpdateMapObjectBody {
  address?: string;
  lat?: number;
  lng?: number;
  status?: MapObjectStatus;
}

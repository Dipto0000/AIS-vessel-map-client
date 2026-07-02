import type { Vessel } from '@/types/vessel';

const BASE = '/api';

export async function fetchVessels(): Promise<Vessel[]> {
  const res = await fetch(`${BASE}/vessels`);
  if (!res.ok) throw new Error(`fetchVessels failed (${res.status})`);
  const json = await res.json();
  return json.data as Vessel[];
}

export async function fetchVesselByMmsi(mmsi: number): Promise<Vessel> {
  const res = await fetch(`${BASE}/vessels/${mmsi}`);
  if (!res.ok) throw new Error(`fetchVesselByMmsi failed (${res.status})`);
  const json = await res.json();
  return json.data as Vessel;
}

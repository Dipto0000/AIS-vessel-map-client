
export interface Vessel {
  mmsi: number;
  vesselName: string;
  latitude?: number;
  longitude?: number;
  sog: number;
  cog: number;
  heading: number;
  vesselType: string;
  updatedAt: string;
}

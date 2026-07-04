import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

import { useVessels } from '@/hooks/useVessels';
import { VesselMarker } from './VesselMarker';

import type { Vessel } from '@/types/vessel';

const FALLBACK_CENTER: [number, number] = [51.92, 4.48];
const FALLBACK_ZOOM = 8;

function MapBoundsFitter({ vessels }: { vessels: Vessel[] }) {
  const map = useMap();
  const hasFit = useRef(false);

  useEffect(() => {
    if (hasFit.current) return;

    const positioned = vessels.filter((v) => v.latitude != null && v.longitude != null);
    if (positioned.length === 0) return;

    const bounds = L.latLngBounds(
      positioned.map((v) => [v.latitude!, v.longitude!] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [50, 50] });
    hasFit.current = true;
    // No cleanup — ref persists across StrictMode double-mount
  }, [vessels, map]);

  return null;
}

export default function VesselMap() {
  const { data: vessels, isLoading, isError, error } = useVessels();

  if (isLoading) {
    return (
      <div className="map-placeholder">
        <p>Loading vessels…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="map-placeholder error">
        <p>Failed to load vessels: {error?.message}</p>
      </div>
    );
  }

  const positioned = vessels?.filter((v) => v.latitude != null && v.longitude != null) ?? [];

  return (
    <>
      <MapContainer center={FALLBACK_CENTER} zoom={FALLBACK_ZOOM} className="vessel-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positioned.map((vessel) => (
          <VesselMarker key={vessel.mmsi} vessel={vessel} />
        ))}
        {positioned.length > 0 && <MapBoundsFitter vessels={positioned} />}
      </MapContainer>
      <div className="vessel-count">{positioned.length} vessels</div>
    </>
  );
}

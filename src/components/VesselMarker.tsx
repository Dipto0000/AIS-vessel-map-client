import { memo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import { divIcon, type LatLngExpression } from 'leaflet';

import type { Vessel } from '@/types/vessel';

const icon = divIcon({
  className: 'vessel-marker',
  html: '<div class="vessel-dot" />',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

interface VesselMarkerProps {
  vessel: Vessel;
}

function VesselMarkerInner({ vessel }: VesselMarkerProps) {
  const { latitude, longitude, mmsi, vesselName } = vessel;

  if (latitude == null || longitude == null) return null;

  const position: LatLngExpression = [latitude, longitude];

  return (
    <Marker position={position} icon={icon}>
      <Tooltip direction="top" offset={[0, -8]}>
        <div className="vessel-tooltip">
          <strong>{vesselName || 'Unknown'}</strong>
          <br />
          MMSI: {mmsi}
          <br />
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </div>
      </Tooltip>
    </Marker>
  );
}

export const VesselMarker = memo(VesselMarkerInner, (prev, next) => {
  return (
    prev.vessel.latitude === next.vessel.latitude &&
    prev.vessel.longitude === next.vessel.longitude &&
    prev.vessel.sog === next.vessel.sog &&
    prev.vessel.cog === next.vessel.cog &&
    prev.vessel.heading === next.vessel.heading &&
    prev.vessel.vesselName === next.vessel.vesselName
  );
});

import {
  memo,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import {
  divIcon,
  latLng,
  type LatLngExpression,
} from 'leaflet';

import type { Vessel } from '@/types/vessel';

/** Duration of the slide animation between two AIS position reports. */
const ANIMATION_DURATION_MS = 2000;


const SNAP_DISTANCE_METERS = 500;

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
  return (
    <SlidingMarker
      mmsi={mmsi}
      vesselName={vesselName || 'Unknown'}
      latitude={latitude}
      longitude={longitude}
    />
  );
}

interface SlidingMarkerProps {
  mmsi: number;
  vesselName: string;
  latitude: number;
  longitude: number;
}


function SlidingMarker({
  mmsi,
  vesselName,
  latitude,
  longitude,
}: SlidingMarkerProps) {
  const markerRef = useRef<ComponentRef<typeof Marker> | null>(null);

  
  const [initialPos] = useState<LatLngExpression>(() => [latitude, longitude]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const to = latLng(latitude, longitude);
    const from = marker.getLatLng();
    const distance = from.distanceTo(to);

    if (distance >= 1) {
      if (distance >= SNAP_DISTANCE_METERS) {
        // Large drift — snap to the new position immediately.
        marker.setLatLng(to);
      } else {
        // Small drift — smooth glide over the configured duration.
        marker.slideTo(to, { duration: ANIMATION_DURATION_MS });
      }
    }

    return () => {
      marker.slideCancel();
    };
  }, [latitude, longitude]);

  return (
    <Marker ref={markerRef} position={initialPos} icon={icon}>
      <Tooltip direction="top" offset={[0, -8]}>
        <div className="vessel-tooltip">
          <strong>{vesselName}</strong>
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

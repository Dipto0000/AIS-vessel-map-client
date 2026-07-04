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

/** Snap threshold (meters) above which we move instantly rather than glide. */
const SNAP_DISTANCE_METERS = 500;

const SHIP_SVG = `<svg width="24" height="24" viewBox="-12 -12 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M 0 -11 L 4 -3 L 4 8 Q 4 11 0 11 Q -4 11 -4 8 L -4 -3 Z" fill="currentColor"/></svg>`;

const icon = divIcon({
  className: 'vessel-marker',
  html: `<div class="vessel-ship">${SHIP_SVG}</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface VesselMarkerProps {
  vessel: Vessel;
}

function VesselMarkerInner({ vessel }: VesselMarkerProps) {
  const { latitude, longitude, mmsi, vesselName, heading } = vessel;
  if (latitude == null || longitude == null) return null;
  return (
    <SlidingMarker
      mmsi={mmsi}
      vesselName={vesselName || 'Unknown'}
      latitude={latitude}
      longitude={longitude}
      heading={heading ?? 0}
    />
  );
}

interface SlidingMarkerProps {
  mmsi: number;
  vesselName: string;
  latitude: number;
  longitude: number;
  heading: number;
}

function SlidingMarker({
  mmsi,
  vesselName,
  latitude,
  longitude,
  heading,
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
        // Large drift -- snap to the new position immediately.
        marker.setLatLng(to);
      } else {
        // Small drift -- smooth glide over the configured duration.
        marker.slideTo(to, { duration: ANIMATION_DURATION_MS });
      }
    }

    return () => {
      marker.slideCancel();
    };
  }, [latitude, longitude]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const icon = marker.getElement();
    if (!icon) return;
    const ship = icon.querySelector<HTMLElement>('.vessel-ship');
    if (!ship) return;
    const safeHeading = heading > 0 && heading < 360 ? heading : 0;
    ship.style.rotate = `${safeHeading}deg`;
  }, [heading]);

  return (
    <Marker ref={markerRef} position={initialPos} icon={icon}>
      <Tooltip direction="top" offset={[0, -8]}>
        <div className="vessel-tooltip">
          Name: {vesselName}
          <br />
          MMSI: {mmsi}
          <br />
          Lat: {latitude.toFixed(4)}
          <br />
          Lon: {longitude.toFixed(4)}
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

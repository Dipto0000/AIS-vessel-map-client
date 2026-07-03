import 'leaflet';

declare module 'leaflet' {
  interface Marker {
    /**
     * Smoothly slide the marker to a new location over `duration` ms.
     * Interpolation is linear in map pixel space, so the visual glide is a
     * straight line regardless of the vessel's latitude.
     */
    slideTo(
      latLng: L.LatLngExpression,
      options?: {
        duration?: number;
        easing?: (t: number) => number;
        keepAtCenter?: boolean;
      },
    ): this;
    /** Cancel any slide animation currently in progress. */
    slideCancel(): this;
  }
}

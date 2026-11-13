import { lazy, Suspense } from 'react';
import { Skeleton } from './Feedback';

export interface MapPoint {
  id: string | number;
  latitude: number;
  longitude: number;
  /** Radius drawn around the point, so a rough position looks rough. */
  accuracyMeters: number | null;
  /** CSS colour of the dot. */
  color: string;
  /** Shown on hover and on tap. */
  label: string;
}

export interface LocationMapProps {
  points: MapPoint[];
  /** Must give the map a height, e.g. "h-48". */
  className?: string;
  onPointClick?: (point: MapPoint) => void;
}

// Leaflet is about a quarter of the bundle and only a few screens show a map.
const LocationMapView = lazy(() => import('./LocationMapView'));

export function LocationMap(props: LocationMapProps) {
  return (
    <Suspense fallback={<Skeleton className={props.className} />}>
      <LocationMapView {...props} />
    </Suspense>
  );
}

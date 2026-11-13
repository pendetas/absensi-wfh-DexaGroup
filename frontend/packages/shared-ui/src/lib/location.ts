import type { GeoLocation } from './types';

/** Same thresholds as the backend's place lookup (attendance-service/place.service.ts). */
const PRECISE_METERS = 1_000;
const APPROXIMATE_METERS = 20_000;

export type LocationPrecision = 'precise' | 'approximate' | 'unknown';

/** By reported accuracy: precise (GPS or Wi-Fi), approximate (cell towers), unknown (IP guess). */
export function locationPrecision(location: GeoLocation): LocationPrecision {
  const accuracy = location.accuracyMeters ?? Number.POSITIVE_INFINITY;
  if (accuracy <= PRECISE_METERS) return 'precise';
  if (accuracy <= APPROXIMATE_METERS) return 'approximate';
  return 'unknown';
}

/** Whether the position is good enough to put on a map without misleading anyone. */
export const canShowOnMap = (location: GeoLocation | null): location is GeoLocation =>
  location !== null && locationPrecision(location) !== 'unknown';

/** A place line for people: "Coblong, Bandung", "sekitar Bandung", or a plain note. */
export function describeLocation(location: GeoLocation | null, place: string | null): string {
  if (!location) return 'Lokasi tidak dibagikan';
  const precision = locationPrecision(location);
  if (precision === 'unknown') return 'Lokasi tidak dapat dipastikan';
  if (!place) return precision === 'precise' ? 'Lokasi dibagikan' : 'Lokasi perkiraan';
  return precision === 'precise' ? place : `Sekitar ${place}`;
}

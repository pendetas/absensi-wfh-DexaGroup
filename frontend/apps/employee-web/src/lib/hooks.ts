import { useEffect, useState } from 'react';
import { type GeoLocation, locationPrecision } from '@dexa/shared-ui';

/**
 * Server time, ticking every second.
 * The device clock only measures time since the last sync, so a wrong device clock doesn't show.
 */
export function useServerClock(serverTime: string | undefined, receivedAt: number): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (!serverTime) return;
    const offset = new Date(serverTime).getTime() - receivedAt;
    const tick = () => setNow(new Date(Date.now() + offset));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [serverTime, receivedAt]);

  return now;
}

export type LocationState =
  | { status: 'pending' }
  | { status: 'ready'; location: GeoLocation }
  /** The employee said no. Attendance still goes through, without a location. */
  | { status: 'denied' }
  /** "unsupported": the browser has no location at all; "failed": it tried and got nothing. */
  | { status: 'unavailable'; reason: 'unsupported' | 'failed' };

const ATTEMPTS: PositionOptions[] = [
  { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
  // Laptops have no GPS; some browsers give up on high accuracy but answer the plain request.
  { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
];

/** Asks for the device position while `enabled`. Never blocks: every outcome is usable. */
export function useLocation(enabled: boolean): LocationState & { retry: () => void } {
  const [state, setState] = useState<LocationState>({ status: 'pending' });
  const [request, setRequest] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    setState({ status: 'pending' });
    if (!('geolocation' in navigator)) {
      setState({ status: 'unavailable', reason: 'unsupported' });
      return;
    }

    let cancelled = false;
    // A retry must not get the same cached position back, so it asks for a fresh one.
    const fresh = request > 0;
    const attempt = (index: number) =>
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (cancelled) return;
          const location = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracyMeters: Math.round(coords.accuracy),
          };
          if (locationPrecision(location) === 'unknown') {
            console.warn(
              `Location is only a guess: accurate to ${Math.round(coords.accuracy / 1000)} km`,
            );
          }
          setState({ status: 'ready', location });
        },
        (error) => {
          if (cancelled) return;
          if (error.code === error.PERMISSION_DENIED) {
            setState({ status: 'denied' });
          } else if (index + 1 < ATTEMPTS.length) {
            attempt(index + 1);
          } else {
            // Left in the console so a support person can see why, e.g. a timeout.
            console.warn(`Location unavailable (code ${error.code}): ${error.message}`);
            setState({ status: 'unavailable', reason: 'failed' });
          }
        },
        fresh ? { ...ATTEMPTS[index], maximumAge: 0 } : ATTEMPTS[index],
      );
    attempt(0);
    return () => {
      cancelled = true;
    };
  }, [enabled, request]);

  return { ...state, retry: () => setRequest((count) => count + 1) };
}

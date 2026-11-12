import { useEffect, useState } from 'react';
import type { GeoLocation } from '@dexa/shared-ui';

/**
 * The server's clock, ticking every second. The device clock is only used to measure how much
 * time has passed since the server last told us the time, so a wrong device clock doesn't show.
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
  | { status: 'unavailable' };

const LOCATION_TIMEOUT_MS = 15_000;

/** Asks for the device position once while `enabled`. Never blocks: every outcome is usable. */
export function useLocation(enabled: boolean): LocationState {
  const [state, setState] = useState<LocationState>({ status: 'pending' });

  useEffect(() => {
    if (!enabled) return;
    setState({ status: 'pending' });
    if (!('geolocation' in navigator)) {
      setState({ status: 'unavailable' });
      return;
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          location: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracyMeters: Math.round(coords.accuracy),
          },
        });
      },
      (error) => {
        if (cancelled) return;
        setState({
          status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
        });
      },
      { enableHighAccuracy: true, timeout: LOCATION_TIMEOUT_MS, maximumAge: 60_000 },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}

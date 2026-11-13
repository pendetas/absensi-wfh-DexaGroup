import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GeoLocation, PlaceResult } from '@app/common';

/** Device accuracy up to which the position is trusted to the neighbourhood. */
const PRECISE_METERS = 1_000;
/** Up to here only the city is meaningful; beyond it the position is likely IP-based. */
const APPROXIMATE_METERS = 20_000;
const LOOKUP_TIMEOUT_MS = 3_000;
const CACHE_LIMIT = 500;

interface NominatimAddress {
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  quarter?: string;
  city_district?: string;
  city?: string;
  town?: string;
  municipality?: string;
  county?: string;
  state?: string;
}

/**
 * Reverse-geocodes a device position with OpenStreetMap Nominatim.
 * Never throws: a slow or unavailable service only leaves the place name empty.
 */
@Injectable()
export class PlaceService {
  private readonly logger = new Logger(PlaceService.name);
  private readonly cache = new Map<string, string | null>();
  private readonly enabled: boolean;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.enabled = config.get<string>('GEOCODER_ENABLED', 'true') !== 'false';
    this.baseUrl = config.get<string>('GEOCODER_URL', 'https://nominatim.openstreetmap.org');
  }

  async describe(location: GeoLocation): Promise<PlaceResult> {
    const accuracy = location.accuracyMeters ?? Number.POSITIVE_INFINITY;
    if (accuracy > APPROXIMATE_METERS) return { place: null, precision: 'unknown' };

    const precise = accuracy <= PRECISE_METERS;
    const place = await this.lookup(location.latitude, location.longitude, precise);
    return { place, precision: precise ? 'precise' : 'approximate' };
  }

  private async lookup(latitude: number, longitude: number, precise: boolean) {
    if (!this.enabled) return null;
    // About 100 m: close enough to share a name, and it keeps repeat lookups off the service.
    const key = `${latitude.toFixed(3)},${longitude.toFixed(3)},${precise}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const url = new URL('/reverse', this.baseUrl);
    url.search = new URLSearchParams({
      format: 'jsonv2',
      lat: String(latitude),
      lon: String(longitude),
      zoom: precise ? '16' : '10',
      'accept-language': 'id',
    }).toString();

    try {
      const response = await fetch(url, {
        // Nominatim's usage policy asks every client to identify itself.
        headers: { 'User-Agent': 'DexaAbsensiWFH/1.0 (attendance demo)' },
        signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { address?: NominatimAddress };
      const place = body.address ? this.format(body.address, precise) : null;
      this.remember(key, place);
      return place;
    } catch (error) {
      this.logger.warn(`Place lookup failed: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /** Area, city and province, without repeats: "Coblong, Bandung, Jawa Barat". */
  private format(address: NominatimAddress, precise: boolean): string | null {
    const area = precise
      ? (address.suburb ?? address.village ?? address.neighbourhood ?? address.quarter)
      : undefined;
    const city =
      address.city ??
      address.town ??
      address.municipality ??
      address.county ??
      address.city_district;
    const parts = [area, city, address.state].filter(
      (part, index, all): part is string => Boolean(part) && all.indexOf(part) === index,
    );
    return parts.length ? parts.join(', ').slice(0, 160) : null;
  }

  private remember(key: string, place: string | null) {
    // Maps keep insertion order, so the first key is the oldest entry.
    const oldest = this.cache.keys().next();
    if (this.cache.size >= CACHE_LIMIT && !oldest.done) this.cache.delete(oldest.value);
    this.cache.set(key, place);
  }
}

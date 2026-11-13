import { ConfigService } from '@nestjs/config';
import { PlaceService } from './place.service';

const config = (values: Record<string, string> = {}) =>
  ({ get: (key: string, fallback: string) => values[key] ?? fallback }) as unknown as ConfigService;

const reply = (address: Record<string, string>) =>
  Promise.resolve(new Response(JSON.stringify({ address }), { status: 200 }));

describe('PlaceService', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());

  it('names the area, city and province for a precise position', async () => {
    fetchMock.mockImplementation(() =>
      reply({ suburb: 'Coblong', city: 'Bandung', state: 'Jawa Barat' }),
    );
    const result = await new PlaceService(config()).describe({
      latitude: -6.8915,
      longitude: 107.6107,
      accuracyMeters: 25,
    });
    expect(result).toEqual({ place: 'Coblong, Bandung, Jawa Barat', precision: 'precise' });
    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.get('zoom')).toBe('16');
  });

  it('names only the city and province when the position is approximate', async () => {
    fetchMock.mockImplementation(() =>
      reply({ suburb: 'Coblong', city: 'Bandung', state: 'Jawa Barat' }),
    );
    const result = await new PlaceService(config()).describe({
      latitude: -6.9,
      longitude: 107.6,
      accuracyMeters: 5_000,
    });
    expect(result).toEqual({ place: 'Bandung, Jawa Barat', precision: 'approximate' });
  });

  it('does not guess a place for a position from the internet connection', async () => {
    const result = await new PlaceService(config()).describe({
      latitude: -6.9,
      longitude: 107.6,
      accuracyMeters: 1_994_269,
    });
    expect(result).toEqual({ place: null, precision: 'unknown' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips repeated lookups for nearly the same spot', async () => {
    fetchMock.mockImplementation(() => reply({ city: 'Bandung', state: 'Jawa Barat' }));
    const service = new PlaceService(config());
    await service.describe({ latitude: -6.89121, longitude: 107.61021, accuracyMeters: 20 });
    await service.describe({ latitude: -6.89139, longitude: 107.61039, accuracyMeters: 30 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns no place, without failing, when the service is down', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('network down')));
    const result = await new PlaceService(config()).describe({
      latitude: -6.89,
      longitude: 107.61,
      accuracyMeters: 20,
    });
    expect(result).toEqual({ place: null, precision: 'precise' });
  });

  it('can be switched off', async () => {
    const result = await new PlaceService(config({ GEOCODER_ENABLED: 'false' })).describe({
      latitude: -6.89,
      longitude: 107.61,
      accuracyMeters: 20,
    });
    expect(result.place).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

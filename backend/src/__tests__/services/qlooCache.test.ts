import axios from 'axios';
import { QlooService } from '../../services/qloo/qlooService';

jest.mock('axios');

const originalApiKey = process.env.QLOO_API_KEY;

describe('Qloo insights cache and request parameters', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let service: QlooService;

  beforeEach(() => {
    process.env.QLOO_API_KEY = 'test-only-key';
    service = new QlooService();
    service.clearAllCache();
    mockedAxios.get.mockReset();
    mockedAxios.get.mockResolvedValue({
      data: { success: true, results: { entities: [{ entity_id: 'e1', name: 'Coffee House', type: 'place' }] } },
    } as never);
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.QLOO_API_KEY;
    else process.env.QLOO_API_KEY = originalApiKey;
  });

  it('keys raw results by location and take, reports timestamps, and preserves bypass-cache behavior', async () => {
    const first = await service.getInsights('Coimbatore', 15, true);
    const sameQuery = await service.getInsights('Coimbatore', 15, false);
    const otherLimit = await service.getInsights('Coimbatore', 10, false);
    const otherCity = await service.getInsights('Bengaluru', 15, false);
    const bypass = await service.getInsights('Coimbatore', 15, true);

    expect(first.fromCache).toBe(false);
    expect(typeof first.dataTimestamp).toBe('string');
    expect(sameQuery.fromCache).toBe(true);
    expect(otherLimit.fromCache).toBe(false);
    expect(otherCity.fromCache).toBe(false);
    expect(bypass.fromCache).toBe(false);
    expect(mockedAxios.get).toHaveBeenCalledTimes(4);
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/v2/insights'), expect.objectContaining({
      params: expect.objectContaining({
        'filter.type': 'urn:entity:place',
        'filter.location.query': 'Coimbatore',
        take: '15',
      }),
    }));
  });

  it('resolves only exact Qloo tags and changes the cache key when category filters differ', async () => {
    mockedAxios.get.mockImplementation(async (url: string, config?: any) => {
      if (url.includes('/v2/tags')) {
        const term = config?.params?.['filter.query'];
        return {
          data: { results: { tags: [{ id: `urn:tag:category:${term}`, name: term }] } },
        } as never;
      }
      return {
        data: { success: true, results: { entities: [{ entity_id: 'e1', name: 'Place', type: 'place' }] } },
      } as never;
    });

    const coffee = await service.getInsights('Coimbatore', 15, false, 'Coffee');
    const coffeeCached = await service.getInsights('Coimbatore', 15, false, 'Coffee');
    const bakery = await service.getInsights('Coimbatore', 15, false, 'Bakery');

    expect(coffee.categoryTagIds).toEqual(['urn:tag:category:coffee']);
    expect(coffeeCached.fromCache).toBe(true);
    expect(bakery.fromCache).toBe(false);
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/v2/insights'), expect.objectContaining({
      params: expect.objectContaining({ 'filter.tags': 'urn:tag:category:coffee' }),
    }));
  });
});

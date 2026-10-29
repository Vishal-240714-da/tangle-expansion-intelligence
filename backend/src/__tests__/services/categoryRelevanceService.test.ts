import { CategoryRelevanceService } from '../../services/categoryRelevanceService';
import { Evidence } from '../../types';

const evidence = (entityName: string, entityCategory: string, status: Evidence['geographicMatchStatus'] = 'verified-city'): Evidence => ({
  id: entityName,
  entityName,
  entityCategory,
  source: 'live-qloo',
  retrievalTimestamp: new Date().toISOString(),
  geographicMatchStatus: status,
  scope: status === 'verified-city' ? 'city-level' : 'non-local',
  limitations: [],
});

describe('CategoryRelevanceService', () => {
  const service = new CategoryRelevanceService();

  it('classifies a lexical category match separately from affinity and geography', () => {
    const item = service.assess(evidence('Bean House', 'Coffee Shop'), 'Specialty Coffee & Roastery');
    expect(item?.status).toBe('direct');
    expect(item?.method).toBe('keyword-screen-v1');
  });

  it('labels a generic food result as related rather than direct', () => {
    const item = service.assess(evidence('Local Dining', 'Restaurant'), 'Specialty Coffee & Roastery');
    expect(item?.status).toBe('related');
  });

  it('does not infer local relevance from a non-local entity name', () => {
    const item = service.assess(evidence('Coffee House', 'Cafe', 'no-match'), 'Specialty Coffee');
    expect(item?.status).toBe('direct');
  });

  it('marks relevance unassessed when the specialization is missing', () => {
    expect(service.assess(evidence('Bean House', 'Cafe'))?.status).toBe('unassessed');
  });

  it('does not treat popularity or affinity as inputs to category relevance', () => {
    const item = evidence('Temple', 'Hindu Temple');
    item.affinityScore = 0.99;
    item.popularityScore = 0.99;
    expect(service.assess(item, 'Specialty Coffee')?.status).toBe('contextual');
  });
});

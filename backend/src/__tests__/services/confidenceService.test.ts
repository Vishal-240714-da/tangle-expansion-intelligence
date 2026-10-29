import { confidenceService } from '../../services/confidenceService';
import { Evidence } from '../../types';

const makeEvidence = (
  id: string,
  geographicMatchStatus: Evidence['geographicMatchStatus'] = 'verified-city',
  categoryStatus: NonNullable<Evidence['categoryRelevance']>['status'] = 'direct',
  entityCategory = 'Cafe'
): Evidence => ({
  id,
  entityName: `Coffee shop ${id}`,
  entityCategory,
  source: 'live-qloo',
  retrievalTimestamp: new Date().toISOString(),
  geographicMatchStatus,
  scope: geographicMatchStatus === 'verified-city' ? 'city-level' : geographicMatchStatus === 'no-match' ? 'non-local' : 'global',
  categoryRelevance: {
    status: categoryStatus,
    score: categoryStatus === 'direct' ? 100 : categoryStatus === 'related' ? 60 : categoryStatus === 'contextual' ? 25 : 0,
    explanation: 'Test rule screen result.',
    method: 'keyword-screen-v1',
  },
  limitations: [],
});

describe('ConfidenceService', () => {
  it('returns zero and abstains when no evidence is available', () => {
    const result = confidenceService.calculateConfidence([], 'live-qloo');
    expect(result.score).toBe(0);
    expect(result.abstentionReason).toContain('No evidence');
  });

  it('scores strong exact-city, category-relevant evidence with diagnosable factors', () => {
    const evidence = [makeEvidence('1'), makeEvidence('2'), makeEvidence('3', 'verified-city', 'related', 'Restaurant')];
    const result = confidenceService.calculateConfidence(evidence, 'live-qloo');
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.abstentionReason).toBeUndefined();
    expect(result.factorScores).toEqual(expect.objectContaining({ sourceQuality: 20, geographicCoverage: 25 }));
  });

  it('penalizes a mixed geographic result in proportion to mismatches rather than capping the score', () => {
    const strong = [makeEvidence('1'), makeEvidence('2'), makeEvidence('3')];
    const mixed = [makeEvidence('1'), makeEvidence('2'), makeEvidence('3', 'no-match')];
    const strongResult = confidenceService.calculateConfidence(strong, 'live-qloo');
    const mixedResult = confidenceService.calculateConfidence(mixed, 'live-qloo');
    expect(mixedResult.score).toBeLessThan(strongResult.score);
    expect(mixedResult.score).toBeGreaterThan(30);
    expect(mixedResult.abstentionReason).toBeUndefined();
  });

  it('abstains when exact-city evidence is weakly relevant to the requested category', () => {
    const result = confidenceService.calculateConfidence([
      makeEvidence('1', 'verified-city', 'unrelated'),
      makeEvidence('2', 'verified-city', 'contextual', 'Mall'),
    ], 'live-qloo');
    expect(result.abstentionReason).toContain('passed the category screen');
  });

  it('abstains for global-only evidence, while retaining a proportional score', () => {
    const result = confidenceService.calculateConfidence([
      makeEvidence('1', 'global'), makeEvidence('2', 'global'),
    ], 'live-qloo');
    expect(result.abstentionReason).toBeDefined();
    expect(result.score).toBeLessThan(80);
  });

  it('keeps missing affinity as a limitation, not an automatic abstention reason', () => {
    const result = confidenceService.calculateConfidence([
      makeEvidence('1'), makeEvidence('2'),
    ], 'live-qloo');
    expect(result.abstentionReason).toBeUndefined();
    expect(result.factors.entityRelevance).toContain('affinity score(s) unavailable');
  });

  it('labels and abstains on demo fixtures', () => {
    const result = confidenceService.calculateConfidence([
      makeEvidence('1'), makeEvidence('2'),
    ], 'demo-fixture');
    expect(result.abstentionReason).toContain('Synthetic demo fixtures');
    expect(result.factors.sourceQuality).toBe('Synthetic demo fixtures');
  });

  it('reduces the score for cached Qloo source quality', () => {
    const evidence = [makeEvidence('1'), makeEvidence('2')];
    const live = confidenceService.calculateConfidence(evidence, 'live-qloo');
    const cached = confidenceService.calculateConfidence(evidence, 'cached-qloo');
    expect(cached.factorScores?.sourceQuality).toBeLessThan(live.factorScores!.sourceQuality);
    expect(cached.score).toBeLessThan(live.score);
  });
});

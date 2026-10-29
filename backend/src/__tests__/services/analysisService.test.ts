import { AnalysisService } from '../../services/analysisService';
import { qlooService } from '../../services/qloo/qlooService';
import { demoService } from '../../services/demoService';

jest.mock('../../services/qloo/qlooService', () => ({
  qlooService: {
    isAvailable: jest.fn(),
    getInsights: jest.fn(),
    toEvidence: jest.fn(),
  },
}));

jest.mock('../../services/demoService', () => ({
  demoService: {
    generateDemoEvidence: jest.fn(),
    generateDemoCulturalSignals: jest.fn(),
  },
}));

describe('AnalysisService live Qloo mode', () => {
  const service = new AnalysisService();
  const input = {
    targetCity: 'Coimbatore',
    geographicScope: 'city' as const,
    dataMode: 'live' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not silently use demo evidence when Qloo is not configured', async () => {
    jest.mocked(qlooService.isAvailable).mockReturnValue(false);

    await expect(service.performAnalysis(input)).rejects.toThrow('Live Qloo is not configured');
    expect(demoService.generateDemoEvidence).not.toHaveBeenCalled();
  });

  it('does not silently use demo evidence when the live request fails', async () => {
    jest.mocked(qlooService.isAvailable).mockReturnValue(true);
    jest.mocked(qlooService.getInsights).mockRejectedValue(new Error('Qloo request failed'));

    await expect(service.performAnalysis(input)).rejects.toThrow('Qloo request failed');
    expect(demoService.generateDemoEvidence).not.toHaveBeenCalled();
  });

  it('propagates city and bypass-cache inputs, annotates relevance, and preserves mixed geography counts', async () => {
    jest.mocked(qlooService.isAvailable).mockReturnValue(true);
    jest.mocked(qlooService.getInsights).mockResolvedValue({
      entities: [
        { entity_id: 'coffee-1', name: 'Bean Cafe', type: 'place', popularity: 0.8 },
        { entity_id: 'coffee-2', name: 'Roastery House', type: 'place', popularity: 0.6 },
        { entity_id: 'airport', name: 'Airport', type: 'place', popularity: 0.9 },
      ],
      fromCache: false,
      dataTimestamp: '2026-10-29T00:00:00.000Z',
      categoryTagIds: [],
    });
    jest.mocked(qlooService.toEvidence).mockImplementation((entity, city, fromCache, timestamp) => {
      const isMismatch = entity.entity_id === 'airport';
      return {
        id: entity.entity_id,
        entityName: entity.name,
        entityCategory: isMismatch ? 'Airport' : 'Cafe',
        source: fromCache ? 'cached-qloo' : 'live-qloo',
        retrievalTimestamp: timestamp || new Date().toISOString(),
        cacheStatus: fromCache ? 'hit' : 'miss',
        popularityScore: entity.popularity,
        geographicMetadata: { city: isMismatch ? 'Chennai' : city },
        geographicMatchStatus: isMismatch ? 'no-match' : 'verified-city',
        scope: isMismatch ? 'non-local' : 'city-level',
        limitations: [],
      };
    });

    const result = await service.performAnalysis({
      ...input,
      businessCategory: 'Specialty Coffee & Roastery',
      bypassCache: true,
      cafeConcept: 'Local coffee tasting counter',
    });

    expect(qlooService.getInsights).toHaveBeenCalledWith('Coimbatore', 15, true, 'Specialty Coffee & Roastery');
    expect(result.evidenceCoverage.geographyBreakdown['verified-city']).toBe(2);
    expect(result.evidenceCoverage.geographyBreakdown['no-match']).toBe(1);
    expect(result.geographicMatchStatus).toBe('partial-match');
    expect(result.evidenceCoverage.categoryRelevance.direct).toBe(2);
    expect(result.conceptHypotheses[0].supportingEvidenceIds).toEqual(['coffee-1', 'coffee-2']);
    expect(result.conceptHypotheses[0].supportingEvidenceIds).not.toContain('airport');
    expect(result.analysisMetadata?.pipelineVersion).toBe('tangle-evidence-v2');
    expect(result.analysisMetadata?.retrieval?.cacheStatus).toBe('miss');
    expect(result.analysisMetadata?.retrieval?.categoryFilterApplied).toBe(false);
  });
});

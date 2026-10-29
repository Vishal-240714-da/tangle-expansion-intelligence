import { Evidence, DataSource, ConfidenceMetrics, GeographicMatchStatus } from '../types';

/** Evidence quality score only; it is never a probability of business success. */
export class ConfidenceService {
  calculateConfidence(evidence: Evidence[], dataSource: DataSource): ConfidenceMetrics {
    if (evidence.length === 0) {
      return {
        score: 0,
        explanation: 'No evidence is available; the system abstains from market-fit conclusions.',
        factors: {
          sourceQuality: this.sourceDescription(dataSource),
          geographicMatch: 'No evidence to evaluate',
          entityRelevance: 'No specialization relevance assessed',
          dataFreshness: 'No evidence to evaluate',
          evidenceCompleteness: 'No evidence available',
        },
        factorScores: { sourceQuality: 0, geographicCoverage: 0, categoryRelevance: 0, freshness: 0, completeness: 0 },
        abstentionReason: 'No evidence available',
      };
    }

    const source = dataSource === 'live-qloo' ? 20 : dataSource === 'cached-qloo' ? 15 : 0;
    const geoWeight: Record<GeographicMatchStatus, number> = {
      'verified-city': 1,
      'partial-match': 0.45,
      global: 0.15,
      'unknown-geography': 0.1,
      'no-match': 0,
    };
    const geographic = Math.round(25 * evidence.reduce((sum, item) => sum + geoWeight[item.geographicMatchStatus], 0) / evidence.length);
    const relevanceValues = evidence.map(item => item.categoryRelevance?.score ?? 0);
    const relevance = Math.round(20 * relevanceValues.reduce((sum, score) => sum + score, 0) / relevanceValues.length / 100);

    const now = Date.now();
    const ages = evidence.map(item => item.cacheAge ?? Math.max(0, now - new Date(item.retrievalTimestamp).getTime()));
    const freshRatio = ages.filter(age => age <= 24 * 60 * 60 * 1000).length / evidence.length;
    const freshness = Math.round(15 * freshRatio);

    const categories = new Set(evidence.map(item => item.entityCategory).filter(Boolean));
    const completeness = Math.min(20, categories.size * 4);
    const factorScores = {
      sourceQuality: source,
      geographicCoverage: geographic,
      categoryRelevance: relevance,
      freshness,
      completeness,
    };
    const score = Object.values(factorScores).reduce((sum, value) => sum + value, 0);

    const localRelevantCount = evidence.filter(item =>
      item.geographicMatchStatus === 'verified-city' &&
      (item.categoryRelevance?.status === 'direct' || item.categoryRelevance?.status === 'related')
    ).length;
    let abstentionReason: string | undefined;
    if (dataSource === 'demo-fixture') {
      abstentionReason = 'Synthetic demo fixtures are not live market evidence.';
    } else if (localRelevantCount < 2) {
      abstentionReason = `Only ${localRelevantCount} exact-city signal(s) passed the category screen; at least 2 are required for a grounded local-fit hypothesis.`;
    }

    const verified = evidence.filter(item => item.geographicMatchStatus === 'verified-city').length;
    const noMatch = evidence.filter(item => item.geographicMatchStatus === 'no-match').length;
    const direct = evidence.filter(item => item.categoryRelevance?.status === 'direct').length;
    const missingAffinityCount = evidence.filter(item => item.affinityScore === undefined).length;
    return {
      score,
      explanation: abstentionReason
        ? `Evidence score ${score}/100. Abstain: ${abstentionReason}`
        : `Evidence score ${score}/100 across source, geography, category relevance, freshness, and completeness. This is not a success forecast.`,
      factors: {
        sourceQuality: this.sourceDescription(dataSource),
        geographicMatch: `${verified}/${evidence.length} verified city; ${noMatch}/${evidence.length} explicit mismatches`,
        entityRelevance: `${direct} direct lexical category match(es); ${missingAffinityCount}/${evidence.length} affinity score(s) unavailable. Category screening is not a demand measure.`,
        dataFreshness: `${Math.round(freshRatio * 100)}% of evidence timestamps within 24 hours`,
        evidenceCompleteness: `${categories.size} distinct returned categories`,
      },
      factorScores,
      ...(abstentionReason ? { abstentionReason } : {}),
    };
  }

  private sourceDescription(dataSource: DataSource): string {
    switch (dataSource) {
      case 'live-qloo': return 'Live Qloo response';
      case 'cached-qloo': return 'Cached Qloo response';
      case 'demo-fixture': return 'Synthetic demo fixtures';
      default: return 'Non-live source';
    }
  }
}

export const confidenceService = new ConfidenceService();

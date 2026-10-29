import { RiskService } from '../../services/riskService';
import { BusinessInput, Evidence } from '../../types';

const makeEvidence = (
  id: string,
  name: string,
  category: string,
  geography: Evidence['geographicMatchStatus'],
  relevance: NonNullable<Evidence['categoryRelevance']>['status']
): Evidence => ({
  id,
  entityName: name,
  entityCategory: category,
  source: 'live-qloo',
  retrievalTimestamp: new Date().toISOString(),
  geographicMatchStatus: geography,
  scope: geography === 'verified-city' ? 'city-level' : geography === 'no-match' ? 'non-local' : 'global',
  categoryRelevance: { status: relevance, score: relevance === 'direct' ? 100 : relevance === 'related' ? 60 : 0, explanation: 'test', method: 'keyword-screen-v1' },
  limitations: [],
});

const input: BusinessInput = {
  targetCity: 'Coimbatore',
  businessCategory: 'Specialty Coffee',
  geographicScope: 'city',
  dataMode: 'live',
};

describe('RiskService evidence grounding', () => {
  const service = new RiskService();

  it('does not cite arbitrary local place rows as evidence of customer demand', () => {
    const risks = service.assessRisks([makeEvidence('mall', 'Brookefields', 'Shopping Mall', 'verified-city', 'contextual')], input);
    const demand = risks.find(risk => risk.id === 'risk-demand-validation')!;
    expect(demand.supportingEvidence).toEqual([]);
    expect(demand.severity).toBe('high');
    expect(demand.missingInformation.join(' ')).toContain('customer demand');
  });

  it('uses only exact-city category-relevant rows for competitor context', () => {
    const risks = service.assessRisks([
      makeEvidence('local-cafe', 'Bean Cafe', 'Cafe', 'verified-city', 'direct'),
      makeEvidence('wrong-city-cafe', 'Other Cafe', 'Cafe', 'no-match', 'direct'),
    ], input);
    const competition = risks.find(risk => risk.id === 'risk-competitive-context')!;
    expect(competition.supportingEvidence).toEqual(['local-cafe']);
    expect(competition.whyItMatters).toContain('not a complete competitor census');
  });

  it('makes mixed mismatches a proportional field-validation risk, not a market-wide no-match claim', () => {
    const risks = service.assessRisks([
      makeEvidence('local', 'Bean Cafe', 'Cafe', 'verified-city', 'direct'),
      makeEvidence('mismatch', 'Airport', 'Airport', 'no-match', 'contextual'),
    ], input);
    const geography = risks.find(risk => risk.id === 'risk-geographic-coverage')!;
    expect(geography.severity).toBe('high');
    expect(geography.missingInformation.join(' ')).toContain('Most returned records do not verify to Coimbatore');
  });
});

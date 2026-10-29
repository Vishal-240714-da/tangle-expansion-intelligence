import { ConceptGenerator } from '../../services/conceptGenerator';
import { Evidence } from '../../types';

const item = (id: string, status: Evidence['geographicMatchStatus'], categoryStatus: 'direct' | 'unrelated'): Evidence => ({
  id,
  entityName: id,
  entityCategory: 'Coffee Shop',
  source: 'live-qloo',
  retrievalTimestamp: new Date().toISOString(),
  geographicMatchStatus: status,
  scope: status === 'verified-city' ? 'city-level' : 'non-local',
  categoryRelevance: { status: categoryStatus, score: categoryStatus === 'direct' ? 100 : 0, explanation: 'test', method: 'keyword-screen-v1' },
  limitations: [],
});

describe('ConceptGenerator', () => {
  it('uses the requested city and category, and cites only exact-city relevant evidence', () => {
    const generator = new ConceptGenerator();
    const concept = generator.generateConcepts(
      [item('verified-coffee', 'verified-city', 'direct'), item('mismatched-coffee', 'no-match', 'direct'), item('local-unrelated', 'verified-city', 'unrelated')],
      [],
      { targetCity: 'Coimbatore', businessCategory: 'Specialty Coffee', cafeConcept: 'Neighborhood roastery' }
    )[0];
    expect(concept.name).toBe('Neighborhood roastery');
    expect(concept.reasoning).toContain('Coimbatore');
    expect(concept.reasoning).toContain('Specialty Coffee');
    expect(concept.supportingEvidenceIds).toEqual(['verified-coffee']);
    expect(concept.reasoning).toContain('does not establish customer preference');
  });

  it('does not invent audience or menu details when the user did not provide them', () => {
    const concept = new ConceptGenerator().generateConcepts([], [], {
      targetCity: 'Pune', businessCategory: 'Artisan Bakery',
    })[0];
    expect(concept.targetAudienceHypothesis).toContain('Not supplied');
    expect(concept.menuDirection).toContain('Not supplied');
    expect(concept.supportingEvidenceIds).toEqual([]);
    expect(concept.reasoning).toContain('No exact-city evidence');
    expect(concept.validationExperiment).toContain('Pune');
  });
});

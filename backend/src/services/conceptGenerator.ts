import { Evidence, Entity, CafeConcept, BusinessInput } from '../types';

/** Produces one transparent concept hypothesis without inventing menu or audience preferences. */
export class ConceptGenerator {
  generateConcepts(
    evidence: Evidence[],
    _culturalSignals: Entity[],
    businessInput: Partial<Pick<BusinessInput,
      'targetCity' | 'businessCategory' | 'cafeConcept' | 'targetAudience' | 'menuDirection' | 'experienceStrategy'>>
  ): CafeConcept[] {
    const relevantLocal = evidence.filter(item =>
      item.source !== 'demo-fixture' &&
      item.geographicMatchStatus === 'verified-city' &&
      (item.categoryRelevance?.status === 'direct' || item.categoryRelevance?.status === 'related')
    );
    const supportingEvidenceIds = relevantLocal.map(item => item.id);
    const describedEvidence = relevantLocal.slice(0, 4).map(item =>
      `${item.entityName} (${item.id}; ${item.categoryRelevance?.status} lexical match)`
    );
    const city = businessInput.targetCity?.trim() || 'the selected city';
    const category = businessInput.businessCategory?.trim() || 'unspecified business category';
    const conceptName = businessInput.cafeConcept?.trim()
      ? businessInput.cafeConcept.trim().slice(0, 80)
      : `${category} hypothesis`;
    const reasoning = describedEvidence.length > 0
      ? `User-provided hypothesis for ${city} and ${category}. The following exact-city live or cached Qloo place records passed the rule-based category screen: ${describedEvidence.join('; ')}. Their presence does not establish customer preference, demand, or commercial viability.`
      : `User-provided hypothesis for ${city} and ${category}. No exact-city evidence passed the category relevance screen, so no local-fit rationale is asserted.`;

    return [{
      id: `concept-${Date.now()}-input-hypothesis`,
      name: conceptName,
      targetAudienceHypothesis: businessInput.targetAudience?.trim() || 'Not supplied; define and validate with prospective customers.',
      menuDirection: businessInput.menuDirection?.trim() || 'Not supplied; test menu and pricing with prospective customers.',
      experienceStrategy: businessInput.experienceStrategy?.trim() || 'Not supplied; develop through location and customer research.',
      reasoning,
      supportingEvidenceIds,
      assumptions: [
        'Any user-provided concept, audience, menu, and experience details are assumptions until validated.',
        `The requested business category is ${category}.`,
      ],
      evidenceGaps: [
        ...(supportingEvidenceIds.length === 0 ? [`Exact-city place evidence relevant to ${category}`] : []),
        'Observed customer demand and willingness to pay',
        'Competitor density, pricing, and differentiation at the intended site',
        'Local menu preferences and operating feasibility',
      ],
      validationExperiment: `In ${city}, ask 10 prospective customers in the intended catchment: “Would you choose this ${category} concept, what would you order, and at what price?” Record actual responses before revising the hypothesis.`,
    }];
  }
}

export const conceptGenerator = new ConceptGenerator();

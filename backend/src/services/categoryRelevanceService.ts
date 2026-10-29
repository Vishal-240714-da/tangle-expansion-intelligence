import { BusinessInput, CategoryRelevanceStatus, Evidence } from '../types';

const stopWords = new Set(['and', 'for', 'the', 'with', 'all', 'day', 'shop', 'experience']);

function words(value: string): string[] {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
}

/** A conservative, explainable lexical screen. It is not a demand or affinity model. */
export class CategoryRelevanceService {
  assess(evidence: Evidence, businessCategory?: string): Evidence['categoryRelevance'] {
    if (!businessCategory?.trim()) {
      return {
        status: 'unassessed', score: 0,
        explanation: 'No business specialization was supplied, so category relevance was not assessed.',
        method: 'keyword-screen-v1',
      };
    }

    const categoryWords = words(businessCategory).filter(word => !stopWords.has(word));
    const evidenceWords = words([
      evidence.entityName,
      evidence.entityCategory,
      ...(Array.isArray(evidence.explainabilityData?.tags)
        ? evidence.explainabilityData.tags.filter((tag): tag is string => typeof tag === 'string')
        : []),
    ].join(' '));

    const cafeAliases: Record<string, string[]> = {
      coffee: ['coffee', 'cafe', 'espresso', 'roastery', 'roaster'],
      roastery: ['roastery', 'roaster', 'coffee'],
      cafe: ['cafe', 'coffee', 'tea', 'bakery', 'dessert'],
      bakery: ['bakery', 'bake', 'pastry', 'bread', 'dessert'],
      tea: ['tea', 'chai', 'dessert'],
      dessert: ['dessert', 'bakery', 'pastry', 'ice cream'],
      restaurant: ['restaurant', 'dining', 'food', 'cafe', 'coffee'],
      community: ['community', 'social', 'coworking', 'co working'],
      work: ['work', 'coworking', 'co working', 'office'],
      health: ['health', 'wellness', 'organic', 'vegan', 'vegetarian'],
      artisan: ['artisan', 'bakery', 'roastery', 'craft'],
      lounge: ['lounge', 'tea', 'bar', 'cafe'],
    };
    const signals = new Set(categoryWords.flatMap(word => [word, ...(cafeAliases[word] || [])]));
    const exactMatches = [...signals].filter(term => evidenceWords.includes(term));

    let status: CategoryRelevanceStatus;
    let score: number;
    let explanation: string;
    if (exactMatches.length > 0) {
      status = 'direct';
      score = 100;
      explanation = `Rule-based category screen matched: ${exactMatches.slice(0, 4).join(', ')}. This is lexical relevance only, not evidence of customer demand.`;
    } else if (evidenceWords.some(word => ['restaurant', 'food', 'dining', 'beverage', 'bar'].includes(word))) {
      status = 'related';
      score = 60;
      explanation = 'The entity appears food, beverage, or dining related, but no specialization-specific term matched.';
    } else if (evidenceWords.some(word => ['mall', 'hotel', 'tourist', 'airport', 'temple', 'theater', 'museum'].includes(word))) {
      status = 'contextual';
      score = 25;
      explanation = 'The entity may describe a place or activity context, but does not directly match the requested specialization.';
    } else {
      status = 'unrelated';
      score = 0;
      explanation = 'No requested-specialization terms were found in the available entity name, category, or tags.';
    }

    return { status, score, explanation, method: 'keyword-screen-v1' };
  }

  annotate(evidence: Evidence[], businessInput: BusinessInput): Evidence[] {
    return evidence.map(item => ({
      ...item,
      categoryRelevance: this.assess(item, businessInput.businessCategory),
    }));
  }
}

export const categoryRelevanceService = new CategoryRelevanceService();

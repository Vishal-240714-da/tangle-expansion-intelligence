import { Evidence, Entity, CafeConcept, Risk, GeographicMatchStatus, DataSource } from '../types';

/**
 * Demo Service provides synthetic fixtures for demonstration when Qloo API is unavailable
 * All data from this service is clearly labelled as demo-fixture source
 */
export class DemoService {
  /**
   * Generate demo evidence for a given city
   * Note: This is synthetic data for demonstration only, not real market evidence
   */
  generateDemoEvidence(city: string): Evidence[] {
    const evidence: Evidence[] = [];

    // Sample entities that might be relevant for café expansion
    const demoEntities = [
      {
        name: 'Specialty Coffee Culture',
        category: 'Food & Beverage',
        affinityScore: 0.85,
        geographicMatch: 'verified-city' as GeographicMatchStatus,
      },
      {
        name: 'Work From Home Trends',
        category: 'Lifestyle',
        affinityScore: 0.78,
        geographicMatch: 'verified-city' as GeographicMatchStatus,
      },
      {
        name: 'Health Conscious Dining',
        category: 'Food & Beverage',
        affinityScore: 0.72,
        geographicMatch: 'partial-match' as GeographicMatchStatus,
      },
      {
        name: 'Social Gathering Spaces',
        category: 'Lifestyle',
        affinityScore: 0.65,
        geographicMatch: 'verified-city' as GeographicMatchStatus,
      },
      {
        name: 'Artisan Bakeries',
        category: 'Food & Beverage',
        affinityScore: 0.58,
        geographicMatch: 'global' as GeographicMatchStatus,
      },
    ];

    demoEntities.forEach((entity, index) => {
      evidence.push({
        id: `demo-evidence-${index}`,
        entityName: entity.name,
        entityCategory: entity.category,
        source: 'demo-fixture' as DataSource,
        retrievalTimestamp: new Date().toISOString(),
        cacheStatus: 'miss',
        affinityScore: entity.affinityScore,
        geographicMetadata: {
          city: entity.geographicMatch === 'verified-city' ? city : undefined,
          country: 'India',
          countryCode: 'IN',
        },
        geographicMatchStatus: entity.geographicMatch,
        scope: entity.geographicMatch === 'verified-city' ? 'city-level' : 'global',
        limitations: [
          'This is synthetic demo data for demonstration purposes only',
          'Not based on actual market research or real-time data',
          'Do not use for business decisions',
          'Affinity scores are simulated',
        ],
      });
    });

    return evidence;
  }

  /**
   * Generate demo cultural signals
   */
  generateDemoCulturalSignals(city: string): Entity[] {
    return [
      {
        id: 'demo-entity-1',
        name: 'Coffee Enthusiasts',
        type: 'Audience',
        category: 'Consumer Interest',
        affinityScore: 0.82,
        geographicMetadata: {
          city,
          country: 'India',
          countryCode: 'IN',
        },
      },
      {
        id: 'demo-entity-2',
        name: 'Remote Workers',
        type: 'Audience',
        category: 'Lifestyle',
        affinityScore: 0.75,
        geographicMetadata: {
          city,
          country: 'India',
          countryCode: 'IN',
        },
      },
      {
        id: 'demo-entity-3',
        name: 'Health Conscious Consumers',
        type: 'Audience',
        category: 'Consumer Preference',
        affinityScore: 0.68,
        geographicMetadata: {
          city,
          country: 'India',
          countryCode: 'IN',
        },
      },
    ];
  }

  /**
   * Generate demo café concept hypotheses
   */
  generateDemoConcepts(): CafeConcept[] {
    return [
      {
        id: 'demo-concept-1',
        name: 'Co-Working Coffee Space',
        targetAudienceHypothesis: 'Remote workers, freelancers, and students seeking productive environments',
        menuDirection: 'Specialty coffee, healthy snacks, all-day dining options',
        experienceStrategy: 'Fast WiFi, ample power outlets, quiet zones, meeting rooms',
        reasoning: 'Demo hypothesis based on simulated work-from-home trends',
        supportingEvidenceIds: ['demo-evidence-1'],
        assumptions: [
          'Sufficient demand for co-working spaces in target area',
          'Willingness to pay premium for workspace amenities',
          'Reliable internet infrastructure available',
        ],
        evidenceGaps: [
          'Actual co-working space utilization rates',
          'Competitive pricing analysis',
          'Local power and internet reliability',
        ],
        validationExperiment: 'Conduct survey of 100 remote workers in target area about workspace preferences and willingness to pay',
      },
      {
        id: 'demo-concept-2',
        name: 'Artisan Bakery Café',
        targetAudienceHypothesis: 'Food enthusiasts seeking quality baked goods and coffee',
        menuDirection: 'Freshly baked breads, pastries, specialty coffee',
        experienceStrategy: 'Open bakery display, aroma-focused design, morning peak focus',
        reasoning: 'Demo hypothesis based on simulated artisan food interest',
        supportingEvidenceIds: ['demo-evidence-4'],
        assumptions: [
          'Local appreciation for artisan baked goods',
          'Ability to source quality ingredients',
          'Skilled bakery staff available',
        ],
        evidenceGaps: [
          'Local bakery pricing benchmarks',
          'Ingredient supply chain reliability',
          'Labor market for skilled bakers',
        ],
        validationExperiment: 'Test pop-up bakery at local market for 2 weeks to measure demand and price sensitivity',
      },
    ];
  }

  /**
   * Generate demo risk assessment
   */
  generateDemoRisks(_city: string): Risk[] {
    return [
      {
        id: 'demo-risk-1',
        title: 'Insufficient Local Market Data',
        category: 'Data Quality',
        severity: 'high',
        status: 'known',
        whyItMatters: 'Without verified local data, expansion decisions rely on assumptions rather than evidence',
        supportingEvidence: [],
        missingInformation: [
          'Actual footfall patterns in target locations',
          'Local competitor pricing and offerings',
          'Real customer preferences in target area',
        ],
        recommendedAction: 'Conduct on-the-ground market research including site visits, competitor analysis, and customer interviews',
      },
      {
        id: 'demo-risk-2',
        title: 'Operating Economics Uncertainty',
        category: 'Operating Economics',
        severity: 'high',
        status: 'requires-validation',
        whyItMatters: 'Rent, labor, and utility costs significantly impact profitability but are not provided',
        supportingEvidence: [],
        missingInformation: [
          'Commercial rental rates in target area',
          'Local labor costs and availability',
          'Utility and operational expense benchmarks',
        ],
        recommendedAction: 'Research local commercial real estate listings and labor market data before financial projections',
      },
      {
        id: 'demo-risk-3',
        title: 'Competitive Context Unknown',
        category: 'Competitive Context',
        severity: 'medium',
        status: 'requires-validation',
        whyItMatters: 'Existing café density and differentiation opportunities are not assessed',
        supportingEvidence: [],
        missingInformation: [
          'Number and type of existing cafés in target area',
          'Competitor pricing and positioning',
          'Market saturation analysis',
        ],
        recommendedAction: 'Map all existing cafés within 2km radius and analyze their offerings, pricing, and customer traffic',
      },
    ];
  }

  /**
   * Generate demo key findings
   */
  generateDemoKeyFindings(city: string): string[] {
    return [
      `Demo analysis for ${city} - this is synthetic data for demonstration`,
      'Simulated cultural signals suggest potential for specialty coffee concepts',
      'Global affinity patterns may not reflect local preferences',
      'Operating economics and competitive context require primary research',
      'Do not use these findings for actual business decisions',
    ];
  }
}

export const demoService = new DemoService();

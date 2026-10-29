import { BusinessInput, AnalysisResult, DataSource, Evidence, Entity, GeographicMatchStatus, CategoryRelevanceStatus } from '../types';
import { qlooService } from './qloo/qlooService';
import { demoService } from './demoService';
import { confidenceService } from './confidenceService';
import { conceptGenerator } from './conceptGenerator';
import { riskService } from './riskService';
import { categoryRelevanceService } from './categoryRelevanceService';

const PIPELINE_VERSION = 'tangle-evidence-v2';

/**
 * Analysis Service orchestrates the complete expansion analysis workflow
 */
export class AnalysisService {
  /**
   * Perform complete expansion analysis
   */
  async performAnalysis(businessInput: BusinessInput): Promise<AnalysisResult> {
    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Determine data source
    let dataSource: DataSource = businessInput.dataMode === 'live'
      ? 'live-qloo'
      : 'demo-fixture';

    let evidence: Evidence[];
    let culturalSignals: Entity[];
    let keyFindings: string[];
    let retrievalMetadata: NonNullable<AnalysisResult['analysisMetadata']>['retrieval'];

    if (dataSource === 'live-qloo') {
      if (!qlooService.isAvailable()) {
        throw new Error('Live Qloo is not configured. Configure Qloo access or select Demo Fixtures explicitly.');
      }

      const liveResult = await this.performLiveAnalysis(businessInput);
      evidence = liveResult.evidence;
      culturalSignals = liveResult.culturalSignals;
      keyFindings = liveResult.keyFindings;
      retrievalMetadata = {
        provider: 'qloo',
        parameters: {
          'filter.type': 'urn:entity:place',
          'filter.location.query': businessInput.targetCity,
          take: 15,
          ...(liveResult.categoryTagIds.length > 0 ? { 'filter.tags': liveResult.categoryTagIds.join(',') } : {}),
          bypassCache: businessInput.bypassCache ?? false,
        },
        cacheStatus: liveResult.fromCache ? 'hit' : 'miss',
        categoryFilterApplied: liveResult.categoryTagIds.length > 0,
        categoryFilterNote: liveResult.categoryTagIds.length > 0
          ? `Qloo place retrieval was filtered by exact-name-resolved tag IDs; category relevance is still screened locally by keyword rules.`
          : `No exact-name Qloo tag IDs were resolved for ${businessInput.businessCategory || 'the requested category'}; retrieval remains location-based and category relevance is screened locally by keyword rules.`,
        dataTimestamp: liveResult.dataTimestamp,
      };
      if (liveResult.fromCache) {
        dataSource = 'cached-qloo';
      }
    } else {
      // Use demo data
      const demoResult = this.performDemoAnalysis(businessInput);
      evidence = demoResult.evidence;
      culturalSignals = demoResult.culturalSignals;
      keyFindings = demoResult.keyFindings;
    }

    evidence = categoryRelevanceService.annotate(evidence, businessInput);
    const verifiedCount = evidence.filter(item => item.geographicMatchStatus === 'verified-city').length;
    const directCount = evidence.filter(item => item.categoryRelevance?.status === 'direct').length;
    const relatedCount = evidence.filter(item => item.categoryRelevance?.status === 'related').length;
    keyFindings.push(`Observed geography: ${verifiedCount}/${evidence.length} entities have exact city metadata; mixed statuses remain visible per entity.`);
    keyFindings.push(`Rule-based category screen for ${businessInput.businessCategory || 'unspecified category'}: ${directCount} direct and ${relatedCount} related name/category/tag matches. This does not measure demand or affinity.`);
    culturalSignals = evidence
      .filter(item => item.geographicMatchStatus === 'verified-city')
      .map(item => ({
        id: item.id,
        name: item.entityName,
        type: item.entityCategory,
        category: item.entityCategory,
        affinityScore: item.affinityScore,
        geographicMetadata: item.geographicMetadata,
      }));

    // Summarize each row's geography and category screen without collapsing mixed results.
    const evidenceCoverage = this.calculateEvidenceCoverage(evidence);

    // Calculate confidence
    const confidence = confidenceService.calculateConfidence(evidence, dataSource);

    // Determine geographic match status
    const geographicMatchStatus = this.determineOverallGeographicStatus(evidence);

    // Generate concept hypotheses
    const conceptHypotheses = conceptGenerator.generateConcepts(
      evidence,
      culturalSignals,
      {
        cafeConcept: businessInput.cafeConcept,
        targetCity: businessInput.targetCity,
        businessCategory: businessInput.businessCategory,
        targetAudience: businessInput.targetAudience,
        menuDirection: businessInput.menuDirection,
        experienceStrategy: businessInput.experienceStrategy,
      }
    );

    // Assess risks
    const risks = riskService.assessRisks(evidence, businessInput);

    // Generate recommended validations
    const recommendedValidations = this.generateRecommendedValidations(risks);

    // Generate limitations
    const limitations = this.generateLimitations(evidence, dataSource, confidence);

    const analysisResult: AnalysisResult = {
      id: analysisId,
      businessInput,
      sourceIndicator: {
        source: dataSource,
        dataMode: businessInput.dataMode,
      },
      geographicMatchStatus,
      evidenceCoverage,
      confidence,
      keyFindings,
      evidence,
      culturalSignals,
      conceptHypotheses,
      risks,
      recommendedValidations,
      limitations,
      analysisMetadata: {
        pipelineVersion: process.env.TANGLE_PIPELINE_VERSION || PIPELINE_VERSION,
        ...(retrievalMetadata ? { retrieval: retrievalMetadata } : {}),
        resultSource: dataSource,
      },
      generatedAt: new Date().toISOString(),
    };

    return analysisResult;
  }

  private async performLiveAnalysis(businessInput: BusinessInput): Promise<{
    evidence: Evidence[];
    culturalSignals: Entity[];
    keyFindings: string[];
    fromCache: boolean;
    dataTimestamp: string;
    categoryTagIds: string[];
  }> {
    const evidence: any[] = [];
    const culturalSignals: any[] = [];
    const keyFindings: string[] = [];
    let fromCache = false;
    let dataTimestamp = new Date().toISOString();
    let categoryTagIds: string[] = [];

    try {
      // Get insights for the target city using v2 API
      // v2 API uses location-based filtering instead of entity-based
      const insights = await qlooService.getInsights(businessInput.targetCity, 15, businessInput.bypassCache ?? false, businessInput.businessCategory);
      fromCache = insights.fromCache;
      dataTimestamp = insights.dataTimestamp;
      categoryTagIds = insights.categoryTagIds;

      insights.entities.forEach(entity => {
        const evidenceItem = qlooService.toEvidence(
          entity,
          businessInput.targetCity,
          insights.fromCache,
          insights.dataTimestamp
        );
        evidence.push(evidenceItem);

      });

      keyFindings.push(`Observed: Qloo returned ${insights.entities.length} place entities for ${businessInput.targetCity}; source ${insights.fromCache ? 'cached Qloo' : 'live Qloo'}.`);
    }
    catch (error) {
      throw new Error(
        `Live Qloo analysis failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    if (evidence.length === 0) {
      keyFindings.push('No live evidence retrieved from Qloo API');
      keyFindings.push('This may indicate no data available for the requested location');
    }

    return { evidence, culturalSignals, keyFindings, fromCache, dataTimestamp, categoryTagIds };
  }

  private performDemoAnalysis(businessInput: BusinessInput): {
    evidence: Evidence[];
    culturalSignals: Entity[];
    keyFindings: string[];
  } {
    const evidence = demoService.generateDemoEvidence(businessInput.targetCity);
    const culturalSignals = demoService.generateDemoCulturalSignals(businessInput.targetCity);
    const keyFindings = demoService.generateDemoKeyFindings(businessInput.targetCity);

    return { evidence, culturalSignals, keyFindings };
  }

  private calculateEvidenceCoverage(evidence: Evidence[]): {
    totalEvidence: number;
    verifiedLocal: number;
    globalOnly: number;
    categories: Record<string, number>;
    geographyBreakdown: Record<GeographicMatchStatus, number>;
    categoryRelevance: Record<CategoryRelevanceStatus, number>;
  } {
    const totalEvidence = evidence.length;
    const verifiedLocal = evidence.filter(e => e.geographicMatchStatus === 'verified-city').length;
    const globalOnly = evidence.filter(e => e.geographicMatchStatus === 'global').length;

    const categories: Record<string, number> = {};
    const geographyBreakdown: Record<GeographicMatchStatus, number> = {
      'verified-city': 0, 'partial-match': 0, global: 0, 'unknown-geography': 0, 'no-match': 0,
    };
    const categoryRelevance: Record<CategoryRelevanceStatus, number> = {
      direct: 0, related: 0, contextual: 0, unrelated: 0, unassessed: 0,
    };
    evidence.forEach(e => {
      const category = e.entityCategory || 'Uncategorized';
      categories[category] = (categories[category] || 0) + 1;
      geographyBreakdown[e.geographicMatchStatus] += 1;
      categoryRelevance[e.categoryRelevance?.status || 'unassessed'] += 1;
    });

    return {
      totalEvidence,
      verifiedLocal,
      globalOnly,
      categories,
      geographyBreakdown,
      categoryRelevance,
    };
  }

  private determineOverallGeographicStatus(evidence: Evidence[]): GeographicMatchStatus {
    if (evidence.length === 0) {
      return 'unknown-geography';
    }

    const statuses = new Set(evidence.map(item => item.geographicMatchStatus));
    if (statuses.size === 1) return evidence[0].geographicMatchStatus;
    // A single aggregate badge cannot represent a mixed set; keep the aggregate
    // partial and rely on the returned per-status counts and row badges.
    return 'partial-match';
  }

  private generateRecommendedValidations(risks: any[]): string[] {
    const validations: string[] = [];

    // Extract recommended actions from risks
    risks.forEach(risk => {
      if (risk.recommendedAction && !validations.includes(risk.recommendedAction)) {
        validations.push(risk.recommendedAction);
      }
    });

    // Add standard validations if not already present
    if (!validations.some(v => v.includes('customer interview'))) {
      validations.push('Conduct customer interviews to validate concept assumptions');
    }

    if (!validations.some(v => v.includes('competitor'))) {
      validations.push('Perform competitor analysis in target area');
    }

    if (!validations.some(v => v.includes('site visit'))) {
      validations.push('Conduct site visits to assess location suitability');
    }

    return validations;
  }

  private generateLimitations(evidence: Evidence[], dataSource: DataSource, confidence: AnalysisResult['confidence']): string[] {
    const limitations: string[] = [];

    if (dataSource === 'demo-fixture') {
      limitations.push('This analysis uses synthetic demo data for demonstration purposes only');
      limitations.push('Do not use these results for actual business decisions');
      limitations.push('Configure live Qloo API integration for real market analysis');
    }

    if (confidence.abstentionReason) {
      limitations.push(confidence.abstentionReason);
    }

    const hasGlobalOnly = evidence.every(e => e.geographicMatchStatus === 'global');
    if (hasGlobalOnly && evidence.length > 0) {
      limitations.push('All evidence is global-level; may not reflect local market conditions');
    }

    if (evidence.some(item => item.affinityScore === undefined)) {
      limitations.push('Affinity scores are unavailable for some or all location-based results; popularity, when present, is a separate metric and does not establish affinity or demand.');
    } else {
      limitations.push('Affinity scores indicate relative association, not demand or success probability.');
    }
    if (evidence.some(item => item.categoryRelevance?.method === 'keyword-screen-v1')) {
      limitations.push('Business-category relevance is a local keyword screen, not an API category filter, consumer preference measure, or demand estimate.');
    }
    limitations.push('Analysis should be supplemented with primary market research');
    limitations.push('Financial outputs are scenario arithmetic from user-entered assumptions, not local forecasts; validate costs and demand independently.');

    return limitations;
  }
}

export const analysisService = new AnalysisService();

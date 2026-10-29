// Core data types shared between frontend and backend

export type DataSource = 'live-qloo' | 'cached-qloo' | 'demo-fixture' | 'user-assumption' | 'heuristic' | 'ai-hypothesis';

export type GeographicMatchStatus = 'verified-city' | 'partial-match' | 'unknown-geography' | 'global' | 'no-match';
export type CategoryRelevanceStatus = 'direct' | 'related' | 'contextual' | 'unrelated' | 'unassessed';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export type RiskStatus = 'known' | 'unknown' | 'requires-validation';

export interface Entity {
  id: string;
  name: string;
  type: string;
  category?: string;
  affinityScore?: number;
  geographicMetadata?: GeographicMetadata;
}

export interface GeographicMetadata {
  city?: string;
  locality?: string;
  metro?: string;
  region?: string;
  district?: string;
  country?: string;
  countryCode?: string;
}

export interface Evidence {
  id: string;
  entityName: string;
  entityCategory: string;
  source: DataSource;
  retrievalTimestamp: string;
  cacheStatus?: 'hit' | 'miss' | 'stale';
  cacheAge?: number;
  affinityScore?: number;
  popularityScore?: number;
  categoryRelevance?: {
    status: CategoryRelevanceStatus;
    score: number;
    explanation: string;
    method: 'keyword-screen-v1';
  };
  geographicMetadata?: GeographicMetadata;
  geographicMatchStatus: GeographicMatchStatus;
  explainabilityData?: Record<string, unknown>;
  scope: 'city-level' | 'partial' | 'global' | 'non-local' | 'unknown';
  limitations: string[];
}

export interface BusinessInput {
  brandName?: string;
  targetCity: string;
  businessCategory?: string;
  cafeConcept?: string;
  targetAudience?: string;
  menuDirection?: string;
  experienceStrategy?: string;
  geographicScope: 'city' | 'neighborhood';
  dataMode: 'live' | 'demo';
  bypassCache?: boolean;
  budgetAssumptions?: FinancialAssumptions;
  userAssumptions?: Record<string, unknown>;
}

export interface FinancialAssumptions {
  budget?: number;
  monthlyRent?: number;
  menuPrices?: number;
  staffingCosts?: number;
  expectedFootfall?: number;
  averageTransactionValue?: number;
  ingredientCosts?: number;
  marketingBudget?: number;
  capacity?: number;
}

export interface CafeConcept {
  id: string;
  name: string;
  targetAudienceHypothesis: string;
  menuDirection: string;
  experienceStrategy: string;
  reasoning: string;
  supportingEvidenceIds: string[];
  assumptions: string[];
  evidenceGaps: string[];
  validationExperiment: string;
}

export interface Risk {
  id: string;
  title: string;
  category: string;
  severity: RiskSeverity;
  status: RiskStatus;
  whyItMatters: string;
  supportingEvidence?: string[];
  missingInformation: string[];
  recommendedAction: string;
}

export interface ConfidenceMetrics {
  score: number;
  explanation: string;
  factors: {
    sourceQuality: string;
    geographicMatch: string;
    entityRelevance: string;
    dataFreshness: string;
    evidenceCompleteness: string;
  };
  abstentionReason?: string;
  factorScores?: {
    sourceQuality: number;
    geographicCoverage: number;
    categoryRelevance: number;
    freshness: number;
    completeness: number;
  };
}

export interface AnalysisResult {
  id: string;
  businessInput: BusinessInput;
  sourceIndicator: {
    source: DataSource;
    dataMode: 'live' | 'demo';
  };
  geographicMatchStatus: GeographicMatchStatus;
  evidenceCoverage: {
    totalEvidence: number;
    verifiedLocal: number;
    globalOnly: number;
    geographyBreakdown: Record<GeographicMatchStatus, number>;
    categoryRelevance: Record<CategoryRelevanceStatus, number>;
    categories: Record<string, number>;
  };
  confidence: ConfidenceMetrics;
  keyFindings: string[];
  evidence: Evidence[];
  culturalSignals: Entity[];
  conceptHypotheses: CafeConcept[];
  risks: Risk[];
  recommendedValidations: string[];
  limitations: string[];
  analysisMetadata?: {
    pipelineVersion: string;
    retrieval?: {
      provider: 'qloo';
      parameters: Record<string, string | number | boolean | null>;
      cacheStatus: 'hit' | 'miss' | 'not-used';
      categoryFilterApplied: boolean;
      categoryFilterNote: string;
      dataTimestamp: string;
    };
    resultSource: 'live-qloo' | 'cached-qloo' | 'demo-fixture';
  };
  generatedAt: string;
}

export interface Scenario {
  id: string;
  name: string;
  assumptions: FinancialAssumptions & {
    cafeConcept?: string;
    targetAudience?: string;
    geographicChoice?: string;
  };
  calculations?: ScenarioCalculations;
}

export interface ScenarioCalculations {
  estimatedMonthlyRevenue: number;
  operatingExpenses: number;
  contributionMargin: number;
  breakEvenMonths: number;
  assumptions: string[];
}

export interface ComparisonResult {
  scenarios: Scenario[];
  comparison: {
    evidenceCoverage: Record<string, number>;
    geographicMatch: Record<string, GeographicMatchStatus>;
    dataConfidence: Record<string, number>;
    risks: Record<string, number>;
  };
  recommendedNextSteps: string[];
}

export interface ExpansionBrief {
  businessObjective: string;
  targetCity: string;
  concept: string;
  evidenceSources: DataSource[];
  keyObservations: string[];
  culturalSignals: Entity[];
  potentialConcepts: CafeConcept[];
  assumptions: string[];
  dataConfidence: ConfidenceMetrics;
  geographicValidation: string;
  riskAssessment: Risk[];
  scenarioComparisons?: ComparisonResult;
  unresolvedQuestions: string[];
  recommendedNextSteps: string[];
  generatedAt: string;
}

import { Pool, PoolClient } from 'pg';

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export { pool, PoolClient };

// In-memory fallback stores when DATABASE_URL is not configured
const inMemoryAnalyses = new Map<string, any>();
const inMemoryEvidence = new Map<string, any[]>();
const inMemoryScenarios = new Map<string, any[]>();
const inMemoryReports = new Map<string, any>();

export { inMemoryAnalyses, inMemoryEvidence, inMemoryScenarios, inMemoryReports };

export function clearInMemoryStores(): void {
  inMemoryAnalyses.clear();
  inMemoryEvidence.clear();
  inMemoryScenarios.clear();
  inMemoryReports.clear();
}

/**
 * Initialize database schema
 * Creates tables if they don't exist
 */
export async function initializeDatabase() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Analyses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analyses (
        id VARCHAR(255) PRIMARY KEY,
        business_input JSONB NOT NULL,
        source_indicator JSONB NOT NULL,
        geographic_match_status VARCHAR(50) NOT NULL,
        evidence_coverage JSONB NOT NULL,
        confidence JSONB NOT NULL,
        key_findings JSONB NOT NULL,
        cultural_signals JSONB NOT NULL,
        concept_hypotheses JSONB NOT NULL,
        risks JSONB NOT NULL,
        recommended_validations JSONB NOT NULL,
        limitations JSONB NOT NULL,
        analysis_metadata JSONB,
        generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Evidence table
    await client.query(`
      CREATE TABLE IF NOT EXISTS evidence (
        id VARCHAR(255) PRIMARY KEY,
        analysis_id VARCHAR(255) REFERENCES analyses(id) ON DELETE CASCADE,
        entity_name VARCHAR(255) NOT NULL,
        entity_category VARCHAR(255) NOT NULL,
        source VARCHAR(50) NOT NULL,
        retrieval_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        cache_status VARCHAR(20),
        cache_age INTEGER,
        affinity_score DECIMAL(5,4),
        popularity_score DECIMAL(5,4),
        category_relevance JSONB,
        geographic_metadata JSONB,
        geographic_match_status VARCHAR(50) NOT NULL,
        explainability_data JSONB,
        scope VARCHAR(20) NOT NULL,
        limitations JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Additions are idempotent so existing user databases retain their records.
    await client.query(`
      ALTER TABLE analyses ADD COLUMN IF NOT EXISTS analysis_metadata JSONB;
      ALTER TABLE evidence ADD COLUMN IF NOT EXISTS popularity_score DECIMAL(5,4);
      ALTER TABLE evidence ADD COLUMN IF NOT EXISTS category_relevance JSONB;
    `);

    // Scenarios table
    await client.query(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id VARCHAR(255) PRIMARY KEY,
        analysis_id VARCHAR(255) REFERENCES analyses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        assumptions JSONB NOT NULL,
        calculations JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(255) PRIMARY KEY,
        analysis_id VARCHAR(255) REFERENCES analyses(id) ON DELETE CASCADE,
        business_objective TEXT NOT NULL,
        target_city VARCHAR(255) NOT NULL,
        concept TEXT NOT NULL,
        evidence_sources JSONB NOT NULL,
        key_observations JSONB NOT NULL,
        cultural_signals JSONB NOT NULL,
        potential_concepts JSONB NOT NULL,
        assumptions JSONB NOT NULL,
        data_confidence JSONB NOT NULL,
        geographic_validation TEXT NOT NULL,
        risk_assessment JSONB NOT NULL,
        scenario_comparisons JSONB,
        unresolved_questions JSONB NOT NULL,
        recommended_next_steps JSONB NOT NULL,
        generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analyses_generated_at ON analyses(generated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_analyses_target_city ON analyses((business_input->>'targetCity'));
      CREATE INDEX IF NOT EXISTS idx_evidence_analysis_id ON evidence(analysis_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_geographic_match ON evidence(geographic_match_status);
      CREATE INDEX IF NOT EXISTS idx_scenarios_analysis_id ON scenarios(analysis_id);
      CREATE INDEX IF NOT EXISTS idx_reports_analysis_id ON reports(analysis_id);
    `);

    await client.query('COMMIT');
    console.log('Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Save analysis to database
 */
export async function saveAnalysis(analysis: any): Promise<void> {
  // Always store in memory for active runtime retrieval
  inMemoryAnalyses.set(analysis.id, analysis);
  if (Array.isArray(analysis.evidence)) {
    inMemoryEvidence.set(analysis.id, analysis.evidence);
  }

  if (!process.env.DATABASE_URL) {
    return;
  }

  const query = `
    INSERT INTO analyses (
      id, business_input, source_indicator, geographic_match_status,
      evidence_coverage, confidence, key_findings, cultural_signals,
      concept_hypotheses, risks, recommended_validations, limitations,
      analysis_metadata, generated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (id) DO UPDATE SET
      business_input = EXCLUDED.business_input,
      source_indicator = EXCLUDED.source_indicator,
      geographic_match_status = EXCLUDED.geographic_match_status,
      evidence_coverage = EXCLUDED.evidence_coverage,
      confidence = EXCLUDED.confidence,
      key_findings = EXCLUDED.key_findings,
      cultural_signals = EXCLUDED.cultural_signals,
      concept_hypotheses = EXCLUDED.concept_hypotheses,
      risks = EXCLUDED.risks,
      recommended_validations = EXCLUDED.recommended_validations,
      limitations = EXCLUDED.limitations,
      analysis_metadata = EXCLUDED.analysis_metadata,
      generated_at = EXCLUDED.generated_at
  `;

  const values = [
    analysis.id,
    JSON.stringify(analysis.businessInput),
    JSON.stringify(analysis.sourceIndicator),
    analysis.geographicMatchStatus,
    JSON.stringify(analysis.evidenceCoverage),
    JSON.stringify(analysis.confidence),
    JSON.stringify(analysis.keyFindings),
    JSON.stringify(analysis.culturalSignals),
    JSON.stringify(analysis.conceptHypotheses),
    JSON.stringify(analysis.risks),
    JSON.stringify(analysis.recommendedValidations),
    JSON.stringify(analysis.limitations),
    JSON.stringify(analysis.analysisMetadata || null),
    analysis.generatedAt,
  ];

  await pool.query(query, values);

  // Save evidence items
  if (Array.isArray(analysis.evidence)) {
    for (const evidence of analysis.evidence) {
      await saveEvidence(evidence, analysis.id);
    }
  }
}

/**
 * Save evidence to database
 */
export async function saveEvidence(evidence: any, analysisId: string): Promise<void> {
  // Always update in-memory store
  const list = inMemoryEvidence.get(analysisId) || [];
  const existingIdx = list.findIndex((e: any) => e.id === evidence.id);
  if (existingIdx >= 0) {
    list[existingIdx] = evidence;
  } else {
    list.push(evidence);
  }
  inMemoryEvidence.set(analysisId, list);

  if (!process.env.DATABASE_URL) {
    return;
  }

  const query = `
    INSERT INTO evidence (
      id, analysis_id, entity_name, entity_category, source,
      retrieval_timestamp, cache_status, cache_age, affinity_score, popularity_score, category_relevance,
      geographic_metadata, geographic_match_status, explainability_data,
      scope, limitations
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (id) DO UPDATE SET
      analysis_id = EXCLUDED.analysis_id,
      entity_name = EXCLUDED.entity_name,
      entity_category = EXCLUDED.entity_category,
      source = EXCLUDED.source,
      retrieval_timestamp = EXCLUDED.retrieval_timestamp,
      cache_status = EXCLUDED.cache_status,
      cache_age = EXCLUDED.cache_age,
      affinity_score = EXCLUDED.affinity_score,
      popularity_score = EXCLUDED.popularity_score,
      category_relevance = EXCLUDED.category_relevance,
      geographic_metadata = EXCLUDED.geographic_metadata,
      geographic_match_status = EXCLUDED.geographic_match_status,
      explainability_data = EXCLUDED.explainability_data,
      scope = EXCLUDED.scope,
      limitations = EXCLUDED.limitations
  `;

  const values = [
    evidence.id,
    analysisId,
    evidence.entityName,
    evidence.entityCategory,
    evidence.source,
    evidence.retrievalTimestamp,
    evidence.cacheStatus,
    evidence.cacheAge,
    evidence.affinityScore,
    evidence.popularityScore,
    evidence.categoryRelevance ? JSON.stringify(evidence.categoryRelevance) : null,
    evidence.geographicMetadata ? JSON.stringify(evidence.geographicMetadata) : null,
    evidence.geographicMatchStatus,
    evidence.explainabilityData ? JSON.stringify(evidence.explainabilityData) : null,
    evidence.scope,
    JSON.stringify(evidence.limitations),
  ];

  await pool.query(query, values);
}

/**
 * Retrieve analysis by ID
 */
export async function getAnalysis(id: string): Promise<any | null> {
  // Check in-memory store first
  if (inMemoryAnalyses.has(id)) {
    return inMemoryAnalyses.get(id);
  }

  if (!process.env.DATABASE_URL) {
    return null;
  }

  const query = 'SELECT * FROM analyses WHERE id = $1';
  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const analysis = {
    id: row.id,
    businessInput: row.business_input,
    sourceIndicator: row.source_indicator,
    geographicMatchStatus: row.geographic_match_status,
    evidenceCoverage: row.evidence_coverage,
    confidence: row.confidence,
    keyFindings: row.key_findings,
    culturalSignals: row.cultural_signals,
    conceptHypotheses: row.concept_hypotheses,
    risks: row.risks,
    recommendedValidations: row.recommended_validations,
    limitations: row.limitations,
    analysisMetadata: row.analysis_metadata,
    generatedAt: row.generated_at,
  };
  inMemoryAnalyses.set(analysis.id, analysis);
  return analysis;
}

/**
 * Retrieve evidence for an analysis
 */
export async function getEvidenceByAnalysisId(analysisId: string): Promise<any[]> {
  if (inMemoryEvidence.has(analysisId)) {
    return inMemoryEvidence.get(analysisId) || [];
  }

  if (!process.env.DATABASE_URL) {
    return [];
  }

  const query = 'SELECT * FROM evidence WHERE analysis_id = $1 ORDER BY retrieval_timestamp DESC';
  const result = await pool.query(query, [analysisId]);

  const list = result.rows.map(row => ({
    id: row.id,
    analysisId: row.analysis_id,
    entityName: row.entity_name,
    entityCategory: row.entity_category,
    source: row.source,
    retrievalTimestamp: row.retrieval_timestamp,
    cacheStatus: row.cache_status,
    cacheAge: row.cache_age,
    affinityScore: row.affinity_score,
    popularityScore: row.popularity_score,
    categoryRelevance: row.category_relevance,
    geographicMetadata: row.geographic_metadata,
    geographicMatchStatus: row.geographic_match_status,
    explainabilityData: row.explainability_data,
    scope: row.scope,
    limitations: row.limitations,
  }));
  inMemoryEvidence.set(analysisId, list);
  return list;
}

/**
 * Save scenario to database
 */
export async function saveScenario(scenario: any, analysisId: string): Promise<void> {
  const existingScenarios = inMemoryScenarios.get(analysisId) || [];
  const updatedScenarios = existingScenarios.filter((s: any) => s.id !== scenario.id);
  updatedScenarios.push(scenario);
  inMemoryScenarios.set(analysisId, updatedScenarios);

  if (!process.env.DATABASE_URL) {
    return;
  }

  const query = `
    INSERT INTO scenarios (id, analysis_id, name, assumptions, calculations)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO UPDATE SET
      analysis_id = EXCLUDED.analysis_id,
      name = EXCLUDED.name,
      assumptions = EXCLUDED.assumptions,
      calculations = EXCLUDED.calculations
  `;

  const values = [
    scenario.id,
    analysisId,
    scenario.name,
    JSON.stringify(scenario.assumptions),
    scenario.calculations ? JSON.stringify(scenario.calculations) : null,
  ];

  await pool.query(query, values);
}

/**
 * Retrieve scenarios for an analysis
 */
export async function getScenariosByAnalysisId(analysisId: string): Promise<any[]> {
  if (inMemoryScenarios.has(analysisId)) {
    return inMemoryScenarios.get(analysisId) || [];
  }

  if (!process.env.DATABASE_URL) {
    return [];
  }

  const query = 'SELECT * FROM scenarios WHERE analysis_id = $1 ORDER BY created_at';
  const result = await pool.query(query, [analysisId]);

  const list = result.rows.map(row => ({
    id: row.id,
    analysisId: row.analysis_id,
    name: row.name,
    assumptions: row.assumptions,
    calculations: row.calculations,
  }));
  inMemoryScenarios.set(analysisId, list);
  return list;
}

/**
 * Save report to database
 */
export async function saveReport(report: any, analysisId: string): Promise<void> {
  inMemoryReports.set(analysisId, report);

  if (!process.env.DATABASE_URL) {
    return;
  }

  const query = `
    INSERT INTO reports (
      id, analysis_id, business_objective, target_city, concept,
      evidence_sources, key_observations, cultural_signals, potential_concepts,
      assumptions, data_confidence, geographic_validation, risk_assessment,
      scenario_comparisons, unresolved_questions, recommended_next_steps,
      generated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    ON CONFLICT (id) DO UPDATE SET
      analysis_id = EXCLUDED.analysis_id,
      business_objective = EXCLUDED.business_objective,
      target_city = EXCLUDED.target_city,
      concept = EXCLUDED.concept,
      evidence_sources = EXCLUDED.evidence_sources,
      key_observations = EXCLUDED.key_observations,
      cultural_signals = EXCLUDED.cultural_signals,
      potential_concepts = EXCLUDED.potential_concepts,
      assumptions = EXCLUDED.assumptions,
      data_confidence = EXCLUDED.data_confidence,
      geographic_validation = EXCLUDED.geographic_validation,
      risk_assessment = EXCLUDED.risk_assessment,
      scenario_comparisons = EXCLUDED.scenario_comparisons,
      unresolved_questions = EXCLUDED.unresolved_questions,
      recommended_next_steps = EXCLUDED.recommended_next_steps,
      generated_at = EXCLUDED.generated_at
  `;

  const values = [
    report.id,
    analysisId,
    report.businessObjective,
    report.targetCity,
    report.concept,
    JSON.stringify(report.evidenceSources),
    JSON.stringify(report.keyObservations),
    JSON.stringify(report.culturalSignals),
    JSON.stringify(report.potentialConcepts),
    JSON.stringify(report.assumptions),
    JSON.stringify(report.dataConfidence),
    report.geographicValidation,
    JSON.stringify(report.riskAssessment),
    report.scenarioComparisons ? JSON.stringify(report.scenarioComparisons) : null,
    JSON.stringify(report.unresolvedQuestions),
    JSON.stringify(report.recommendedNextSteps),
    report.generatedAt,
  ];

  await pool.query(query, values);
}

/**
 * Retrieve report by analysis ID
 */
export async function getReportByAnalysisId(analysisId: string): Promise<any | null> {
  if (inMemoryReports.has(analysisId)) {
    return inMemoryReports.get(analysisId);
  }

  if (!process.env.DATABASE_URL) {
    return null;
  }

  const query = 'SELECT * FROM reports WHERE analysis_id = $1';
  const result = await pool.query(query, [analysisId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const report = {
    id: row.id,
    analysisId: row.analysis_id,
    businessObjective: row.business_objective,
    targetCity: row.target_city,
    concept: row.concept,
    evidenceSources: row.evidence_sources,
    keyObservations: row.key_observations,
    culturalSignals: row.cultural_signals,
    potentialConcepts: row.potential_concepts,
    assumptions: row.assumptions,
    dataConfidence: row.data_confidence,
    geographicValidation: row.geographic_validation,
    riskAssessment: row.risk_assessment,
    scenarioComparisons: row.scenario_comparisons,
    unresolvedQuestions: row.unresolved_questions,
    recommendedNextSteps: row.recommended_next_steps,
    generatedAt: row.generated_at,
  };
  inMemoryReports.set(analysisId, report);
  return report;
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  try {
    if (!pool.ended) {
      await pool.end();
      console.log('Database connection closed');
    }
  } catch (err) {
    // Ignore error on close
  }
}

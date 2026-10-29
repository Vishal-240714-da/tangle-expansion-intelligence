import http from 'http';
import { app } from '../../index';
import { saveAnalysis, clearInMemoryStores, closeDatabase } from '../../models/database';
import { AnalysisResult, BusinessInput } from '../../types';

describe('Analysis Retrieval & Error Handling Regression Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeAll((done) => {
    // Start an HTTP server on an ephemeral port
    server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://localhost:${addr.port}`;
        done();
      } else {
        done(new Error('Failed to bind server to port'));
      }
    });
  });

  afterAll(async () => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    if (server) {
      if (typeof (server as any).closeAllConnections === 'function') {
        (server as any).closeAllConnections();
      }
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    await closeDatabase();
  });

  beforeEach(() => {
    clearInMemoryStores();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  const createSampleAnalysis = (id: string, city: string = 'Coimbatore'): AnalysisResult => {
    const businessInput: BusinessInput = {
      targetCity: city,
      geographicScope: 'city',
      dataMode: 'demo',
    };

    return {
      id,
      businessInput,
      sourceIndicator: {
        source: 'demo-fixture',
        dataMode: 'demo',
      },
    geographicMatchStatus: 'verified-city',
    evidenceCoverage: {
      totalEvidence: 2,
      verifiedLocal: 2,
      globalOnly: 0,
      geographyBreakdown: {
        'verified-city': 2,
        'partial-match': 0,
        global: 0,
        'no-match': 0,
        'unknown-geography': 0,
      },
      categoryRelevance: {
        direct: 2,
        related: 0,
        contextual: 0,
        unrelated: 0,
        unassessed: 0,
      },
      categories: { 'Food & Beverage': 2 },
    },
      confidence: {
        score: 82,
        explanation: 'High confidence based on verified local signals',
        factors: {
          sourceQuality: 'High',
          geographicMatch: 'verified-city',
          entityRelevance: 'Direct',
          dataFreshness: 'Current',
          evidenceCompleteness: 'Sufficient',
        },
      },
      keyFindings: ['Finding 1', 'Finding 2'],
      evidence: [
        {
          id: `ev-${id}-1`,
          entityName: 'Local Coffee Culture',
          entityCategory: 'Food & Beverage',
          source: 'demo-fixture',
          retrievalTimestamp: new Date().toISOString(),
          geographicMatchStatus: 'verified-city',
          scope: 'city-level',
          limitations: ['Synthetic fixture'],
        },
        {
          id: `ev-${id}-2`,
          entityName: 'Artisan Bakery',
          entityCategory: 'Food & Beverage',
          source: 'demo-fixture',
          retrievalTimestamp: new Date().toISOString(),
          geographicMatchStatus: 'verified-city',
          scope: 'city-level',
          limitations: ['Synthetic fixture'],
        },
      ],
      culturalSignals: [],
      conceptHypotheses: [],
      risks: [],
      recommendedValidations: [],
      limitations: [],
      generatedAt: new Date().toISOString(),
    };
  };

  test('1. GET /api/analysis/:id for an unknown ID returns HTTP 404 JSON', async () => {
    const res = await fetch(`${baseUrl}/api/analysis/nonexistent-analysis-id-9999`);
    expect(res.status).toBe(404);

    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.status).toBe('error');
    expect(json.message).toBe('Analysis not found');
  });

  test('2. The server continues responding after multiple 404s without exiting', async () => {
    // Fire consecutive 404s
    for (let i = 0; i < 5; i++) {
      const notFoundRes = await fetch(`${baseUrl}/api/analysis/invalid-${i}`);
      expect(notFoundRes.status).toBe(404);
    }

    // Server must still be responsive
    const healthRes = await fetch(`${baseUrl}/api/health`);
    expect(healthRes.status).toBe(200);
    const healthJson = (await healthRes.json()) as any;
    expect(healthJson.status).toBe('ok');
  });

  test('3. Unexpected validation error returns HTTP 400 without terminating server', async () => {
    // Empty city should fail validation schema
    const res = await fetch(`${baseUrl}/api/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCity: '' }),
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.status).toBe('error');
    expect(json.message).toContain('Validation error');

    // Server remains alive
    const healthRes = await fetch(`${baseUrl}/api/health`);
    expect(healthRes.status).toBe(200);
  });

  test('4. An analysis saved in memory can be retrieved by the same ID during runtime', async () => {
    const analysisId = `analysis-mem-test-${Date.now()}`;
    const sample = createSampleAnalysis(analysisId, 'Kochi');

    await saveAnalysis(sample);

    const res = await fetch(`${baseUrl}/api/analysis/${analysisId}`);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(analysisId);
    expect(json.data.businessInput.targetCity).toBe('Kochi');
  });

  test('5. Associated evidence is returned correctly with its analysis', async () => {
    const analysisId = `analysis-ev-test-${Date.now()}`;
    const sample = createSampleAnalysis(analysisId, 'Madurai');

    await saveAnalysis(sample);

    const res = await fetch(`${baseUrl}/api/analysis/${analysisId}`);
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(Array.isArray(json.data.evidence)).toBe(true);
    expect(json.data.evidence.length).toBe(2);
    expect(json.data.evidence[0].id).toBe(`ev-${analysisId}-1`);
    expect(json.data.evidence[1].id).toBe(`ev-${analysisId}-2`);
  });

  test('6. Missing DATABASE_URL does not trigger slow PostgreSQL connection timeouts', async () => {
    delete process.env.DATABASE_URL;

    const start = Date.now();
    const res = await fetch(`${baseUrl}/api/analysis/immediate-missing-check`);
    const elapsed = Date.now() - start;

    expect(res.status).toBe(404);
    // Should return almost instantaneously (well under 500ms, not waiting for 2000ms connection timeout)
    expect(elapsed).toBeLessThan(1000);
  });

  test('7. Database connection failure is handled honestly as HTTP 500, not disguised as 404', async () => {
    // Point DATABASE_URL to an invalid unreachable port
    process.env.DATABASE_URL = 'postgres://fakeuser:fakepass@127.0.0.1:54399/fakedb';

    const res = await fetch(`${baseUrl}/api/analysis/unknown-id-while-db-down`);
    expect(res.status).toBe(500);

    const json = (await res.json()) as any;
    expect(json.status).toBe('error');
    expect(json.message).toContain('Database error while retrieving analysis');
  });

  test('8. Full POST /api/analysis submission followed by GET /api/analysis/:id retrieval works seamlessly', async () => {
    delete process.env.DATABASE_URL;

    const postRes = await fetch(`${baseUrl}/api/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetCity: 'Coimbatore',
        geographicScope: 'city',
        dataMode: 'demo',
        cafeConcept: 'Specialty Roastery & Working Café',
      }),
    });

    expect(postRes.status).toBe(200);
    const postJson = (await postRes.json()) as any;
    expect(postJson.success).toBe(true);
    expect(postJson.data.id).toBeDefined();

    const createdId = postJson.data.id;

    // Immediately retrieve by ID
    const getRes = await fetch(`${baseUrl}/api/analysis/${createdId}`);
    expect(getRes.status).toBe(200);
    const getJson = (await getRes.json()) as any;

    expect(getJson.success).toBe(true);
    expect(getJson.data.id).toBe(createdId);
    expect(getJson.data.businessInput.targetCity).toBe('Coimbatore');
    expect(Array.isArray(getJson.data.evidence)).toBe(true);
    expect(getJson.data.evidence.length).toBeGreaterThan(0);
  });
});

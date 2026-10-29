# TANGLE Architecture Documentation

## System Overview

TANGLE is a full-stack application with a modular architecture designed for maintainability, testability, and clear separation of concerns.

## Architecture Diagram

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
│   Port: 5173    │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│   Backend       │
│   (Express)     │
│   Port: 3000    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────┐  ┌─────────┐
│ Qloo │  │PostgreSQL│
│ API  │  │(Optional)│
└──────┘  └─────────┘
```

## Backend Architecture

### Layer Structure

```
backend/src/
├── index.ts              # Application entry point
├── routes/               # API route handlers
│   ├── health.ts
│   ├── analysis.ts
│   ├── scenarios.ts
│   └── reports.ts
├── services/             # Business logic
│   ├── analysisService.ts      # Orchestrates analysis workflow
│   ├── qloo/
│   │   └── qlooService.ts      # Qloo API integration
│   ├── demoService.ts          # Demo data generation
│   ├── confidenceService.ts    # Confidence scoring
│   ├── conceptGenerator.ts     # Concept hypothesis generation
│   ├── riskService.ts          # Risk assessment
│   └── scenarioService.ts      # Scenario calculations
├── models/               # Data persistence
│   └── database.ts             # PostgreSQL models
├── middleware/           # Express middleware
│   └── errorHandler.ts
├── types/                # TypeScript types
│   └── index.ts
└── utils/                # Utility functions
```

### Key Design Principles

1. **Service Layer Pattern**: Business logic is encapsulated in services, not in route handlers
2. **Dependency Injection**: Services are instantiated and imported, not passed around
3. **Type Safety**: All data structures have TypeScript interfaces
4. **Error Handling**: Centralized error handling with custom error classes
5. **Validation**: Request validation using Zod schemas
6. **Provenance Tracking**: All evidence records source, timestamp, and limitations

### Service Responsibilities

#### AnalysisService
- Orchestrates the complete analysis workflow
- Coordinates between Qloo service, confidence service, concept generator, and risk service
- Handles live/demo mode selection
- Generates final analysis result

#### QlooService
- Manages Qloo v2 API integration (`/v2/insights` with location query filtering)
- Implements conservative multi-tier geographic validation:
  - Exact city match (`verified-city`)
  - Metro area & satellite town match (`partial-match`)
  - Suburb/locality text mention (`partial-match`)
  - District-only match or city mismatch (`no-match` / `unverified`)
  - Strict rule: Entity name containing city name does not alone confer `verified-city` status
- Case-normalized in-memory caching (`insights:${location.toLowerCase().trim()}:${take}`)
- Supports cache bypass flag (`bypassCache`) and explicit cache invalidation (`clearLocationCache`, `clearAllCache`)
- Distinguishes truthful provenance (`live-qloo` vs `cached-qloo`)
- Converts Qloo response entities to internal Evidence format with full provenance metadata
- Never exposes API keys or tokens in responses or logs

#### ConfidenceService
- Calculates confidence scores based on evidence quality
- Implements abstention logic when evidence is insufficient
- Considers: source quality, geographic match, entity relevance, data freshness, completeness
- Never interprets confidence as success probability

#### ConceptGenerator
- Generates café concept hypotheses grounded in verified local evidence
- Implements Evidence-to-Decision Graph linking (`supportingEvidenceIds` mapped to entity IDs)
- Clearly labels all concepts as hypotheses requiring commercial validation
- Identifies evidence gaps and recommends field validation experiments

#### RiskService
- Assesses expansion risks across operational, cultural, regulatory, and market categories
- Evaluates risk severity (High, Medium, Low) and links directly to supporting evidence IDs
- Recommends concrete mitigating actions and local field checks
- Does not claim risks are resolved without tangible evidence

#### ScenarioService & Interactive What-If Simulator
- Performs baseline financial model projections (Daily Footfall, ATV, Rent, Staffing, Cost of Goods)
- Supports interactive client-side and server-side What-If simulations
- Computes real-time comparison deltas (Simulated vs Baseline Revenue, Opex, Gross Margin, Payback Period)
- All financial assumptions remain explicit, editable, and resettable

### Database Schema

#### Analyses Table
Stores complete analysis results with all metadata.

#### Evidence Table
Stores individual evidence items with full provenance.

#### Scenarios Table
Stores scenario assumptions and calculations.

#### Reports Table
Stores generated expansion briefs.

All tables use JSONB for flexible schema evolution while maintaining structure.

## Frontend Architecture

### Component Structure

```
frontend/src/
├── main.tsx              # Application entry
├── App.tsx               # Root component with routing
├── pages/                # Page components
│   ├── AnalysisForm.tsx         # Input form
│   └── AnalysisDashboard.tsx   # Results dashboard
├── components/           # Reusable components
│   ├── dashboard/
│   ├── forms/
│   ├── charts/
│   └── graphs/
├── services/             # API client
├── hooks/                # Custom React hooks
├── types/                # TypeScript types
└── utils/                # Utility functions
```

### State Management

- React Router for navigation
- Component state for form data
- URL state for analysis ID sharing
- (Future: Consider Context API or Redux for complex state)

### Styling

- Tailwind CSS for utility-first styling
- Custom component classes in index.css
- Consistent design tokens

## Data Flow

### Analysis Request Flow

```
1. User submits form (Frontend)
   ↓
2. POST /api/analysis (Backend)
   ↓
3. AnalysisService.performAnalysis()
   ↓
4. QlooService.getInsights() (if live mode)
   OR DemoService.generateDemoEvidence() (if demo mode)
   ↓
5. ConfidenceService.calculateConfidence()
   ↓
6. ConceptGenerator.generateConcepts()
   ↓
7. RiskService.assessRisks()
   ↓
8. Return AnalysisResult
   ↓
9. Save to database (if configured)
   ↓
10. Return to frontend
   ↓
11. Display in AnalysisDashboard
```

### Evidence Provenance Flow

```
Qloo API Response
   ↓
Geographic Validation
   ↓
Evidence Conversion (toEvidence)
   ↓
Limitations Generation
   ↓
Confidence Scoring
   ↓
Display with Full Provenance
```

## Geographic Validation

### Critical Safeguard

The system implements strict geographic validation to prevent presenting non-local evidence as local:

1. **Exact City Match**: Only when entity.city matches requested.city exactly
2. **Partial Match**: When entity is in nearby locality or metro area
3. **No Match**: When entity is in different city/country
4. **Global**: When no geographic metadata available

### Example

```
Requested: Coimbatore
Entity Location: Dubai → No Match (cannot present as Coimbatore evidence)
Entity Location: Singanallur, Coimbatore → Partial Match (nearby, not city proper)
Entity Location: Coimbatore → Verified City Match
Entity Location: (no metadata) → Global (cannot verify local relevance)
```

## Confidence Scoring

### Factors

1. **Source Quality** (0-20 points)
   - Live Qloo: 20
   - Cached Qloo: 15
   - Demo fixture: 0

2. **Geographic Match** (0-25 points)
   - >70% verified: 25
   - >50% verified: 20
   - Partial matches: 5-10
   - Global only: 3
   - No match: 0

3. **Entity Relevance** (0-20 points)
   - Based on affinity scores
   - Considers proportion of entities with scores

4. **Data Freshness** (0-15 points)
   - <24 hours: 15
   - <7 days: 12
   - Older: Lower

5. **Evidence Completeness** (0-20 points)
   - Based on diversity of categories

### Abstention Conditions

The system abstains (low confidence + explanation) when:
- Using demo data
- All evidence is global-only
- Evidence has geographic mismatch
- No affinity scores available
- All evidence is >7 days old

## Security Measures

1. **API Key Protection**: Never in frontend code, logs, or client bundles
2. **Environment Variables**: .env excluded from Git
3. **CORS**: Restricted to configured origins
4. **Rate Limiting**: 100 requests per 15 minutes per IP
5. **Input Validation**: Zod schemas on all endpoints
6. **Helmet**: Security headers
7. **Error Handling**: No sensitive data in error messages

## Testing Strategy

### Unit Tests

- Geographic validation logic
- Confidence scoring
- Abstention conditions
- Demo data labeling
- Evidence conversion

### Integration Tests

- API endpoint behavior
- Service orchestration
- Database operations

### Critical Test Cases

1. Prove that Dubai evidence cannot be presented as Coimbatore evidence
2. Prove that global affinity does not establish local demand
3. Prove that demo data is never labelled as live evidence
4. Prove that abstention triggers on insufficient evidence

## Deployment Considerations

### Environment Variables Required

- `PORT`: Server port
- `NODE_ENV`: environment
- `DATABASE_URL`: PostgreSQL connection (optional)
- `QLOO_API_KEY`: Qloo API key (for live mode) - **Pre-configured with hackathon key**
- `QLOO_BASE_URL`: Qloo API endpoint - **Pre-configured with hackathon URL**
- `CORS_ORIGIN`: Allowed frontend origin
- `RATE_LIMIT_WINDOW_MS`: Rate limit window
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window
- `CACHE_TTL_SECONDS`: Cache TTL

**Hackathon API Configuration**:
- API Key: `hack_cd8b6b4519f1d9bdd60a98a735921b999c8917cd`
- Base URL: `https://hackathon.api.qloo.com`

### Database Migration

Schema is auto-initialized on startup. For production:
1. Use migrations (e.g., Knex.js or Flyway)
2. Backup before schema changes
3. Test migrations on staging first

### Scaling Considerations

- Stateless API design allows horizontal scaling
- Use external cache (Redis) for distributed deployments
- Database connection pooling configured
- Rate limiting per-instance (consider distributed rate limiting)

## Future Enhancements

1. **Evidence Graph Visualization**: Interactive graph showing evidence-to-decision connections
2. **Location Comparison**: Side-by-side city/neighborhood comparison
3. **User Authentication**: Save analyses per user
4. **Report Export**: PDF/Word export of expansion briefs
5. **Real-time Updates**: WebSocket for long-running analyses
6. **Additional Data Sources**: Integrate other cultural/ geographic APIs
7. **Advanced Visualization**: Heatmaps, choropleth maps
8. **Collaboration Features**: Share analyses with team

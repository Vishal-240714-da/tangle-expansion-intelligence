# TANGLE Expansion Intelligence - Agent Guidelines

## Project Context

TANGLE is an AI-powered business expansion decision-support platform for independent café owners. The platform helps evaluate expansion opportunities by combining cultural affinity signals, geographic context, and business assumptions.

## Critical Principles (Never Violate)

1. **Never fabricate live evidence** — Only use actual Qloo API responses or explicitly identified demo fixtures.
2. **Never expose API credentials or secrets** — Qloo API keys, database passwords, tokens, and real `.env` contents must never appear in code, logs, documentation, or archives.
3. **Never treat global affinity as local demand** — Global patterns do not demonstrate local consumer appetite.
4. **Never treat affinity as commercial success probability** — Cultural affinity reflects taste correlation, not business profitability.
5. **Never treat a state or district match alone as proof of an exact city match** — Non-city or district matches (e.g. Egattur, Kanathur) must never be marked as `verified-city`.
6. **Never automatically mark geographically uncertain entities as verified** — Entities without verified city metadata remain conservative partial-matches or unverified.
7. **Preserve conservative geographic matching, transparent evidence provenance, honest confidence scoring, and abstention** — Always distinguish `live-qloo` from `cached-qloo` and abstain when local evidence is insufficient.
8. **Never silently fall back to demo data** — The provenance badge and analysis metadata must honestly state whether data came from live Qloo, cached Qloo, or synthetic demo fixtures.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, PostgreSQL (optional)
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **External API**: Qloo Insights API (for cultural affinity data)
- **Testing**: Jest for backend, Vitest for frontend

## Project Structure

```
pro/
├── backend/          # Express API server
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   │   └── qloo/        # Qloo integration
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Express middleware
│   │   └── __tests__/       # Backend tests
│   └── .env.example
├── frontend/         # React application
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   └── types/           # TypeScript types
│   └── vite.config.ts
├── shared/           # Shared types
└── README.md
```

## Common Commands

### Development
```bash
# Install all dependencies
npm install

# Run both backend and frontend
npm run dev

# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend
```

### Building
```bash
# Build all workspaces
npm run build
```

### Testing
```bash
# Run all tests
npm test

# Run backend tests only
cd backend && npm test
```

### Linting
```bash
# Lint all workspaces
npm run lint
```

## Key Services and Their Responsibilities

### AnalysisService (`backend/src/services/analysisService.ts`)
- Orchestrates complete analysis workflow
- Coordinates between Qloo, confidence, concept, and risk services
- Handles live/demo mode selection
- **Never modify without understanding the full workflow**

### QlooService (`backend/src/services/qloo/qlooService.ts`)
- Manages Qloo API integration
- **Critical**: Implements geographic validation
- Caches responses with TTL
- Converts Qloo responses to Evidence format
- **Never expose API key in logs or responses**

### ConfidenceService (`backend/src/services/confidenceService.ts`)
- Calculates confidence scores (0-100)
- Implements abstention logic
- Considers: source quality, geographic match, relevance, freshness, completeness
- **Never interpret confidence as success probability**

### ConceptGenerator (`backend/src/services/conceptGenerator.ts`)
- Generates café concept hypotheses
- **Always label as hypotheses requiring validation**
- Includes evidence gaps and validation experiments
- **Never invent evidence to justify concepts**

### RiskService (`backend/src/services/riskService.ts`)
- Assesses expansion risks
- Identifies missing information
- Provides recommended actions
- **Never claim risks are resolved without evidence**

### DemoService (`backend/src/services/demoService.ts`)
- Generates synthetic demo data
- **Always label source as 'demo-fixture'**
- Include clear limitations and warnings
- **Never use demo data for actual business decisions**

## Geographic Validation Rules

When working with geographic validation in QlooService:

1. **Exact city match** → `verified-city`
2. **Nearby locality** (e.g., Singanallur for Coimbatore) → `partial-match`
3. **Different city** (e.g., Dubai for Coimbatore) → `no-match`
4. **No metadata** → `global`
5. **Empty metadata** → `unknown-geography`

**Critical**: A `partial-match` or `global` status means the evidence cannot support a local-fit conclusion without additional validation.

## Testing Requirements

When adding or modifying features:

1. **Write tests for geographic validation** - Prove non-local evidence cannot be presented as local
2. **Write tests for abstention logic** - Prove system abstains when evidence is insufficient
3. **Write tests for demo data labeling** - Prove demo data is never labelled as live
4. **Write tests for confidence scoring** - Prove global affinity doesn't yield high local confidence

## Database Schema

The application uses PostgreSQL with the following tables:

- `analyses` - Complete analysis results
- `evidence` - Individual evidence items with provenance
- `scenarios` - Scenario assumptions and calculations
- `reports` - Generated expansion briefs

**Note**: Database is optional. The application works without it for in-memory analysis.

## Environment Variables

Required in `backend/.env`:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - PostgreSQL connection (optional)
- `QLOO_API_KEY` - Qloo API key (required for live mode) - **Pre-configured with hackathon key**
- `QLOO_BASE_URL` - Qloo API endpoint - **Pre-configured with hackathon URL**
- `CORS_ORIGIN` - Allowed frontend origin
- `RATE_LIMIT_WINDOW_MS` - Rate limit window
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window
- `CACHE_TTL_SECONDS` - Cache TTL

**Note**: The project comes pre-configured with the Qloo Hackathon API credentials:
- API Key: `hack_cd8b6b4519f1d9bdd60a98a735921b999c8917cd`
- Base URL: `https://hackathon.api.qloo.com`

## Common Issues and Solutions

### Qloo API Integration
- **Issue**: "Qloo API is not configured"
- **Solution**: Set `QLOO_API_KEY` in backend/.env

### Database Connection
- **Issue**: Database connection fails
- **Solution**: Check `DATABASE_URL` format, ensure PostgreSQL is running
- **Note**: Application continues without database if not configured

### Frontend Proxy
- **Issue**: API calls fail in development
- **Solution**: Ensure backend is running on port 3000, frontend proxy is configured in vite.config.ts

### TypeScript Errors
- **Issue**: Type errors in shared types
- **Solution**: Build shared package first: `cd shared && npm run build`

## Adding New Features

1. **Backend**:
   - Add service in `backend/src/services/`
   - Add route in `backend/src/routes/`
   - Update types in `shared/src/types/`
   - Write tests in `backend/src/__tests__/`

2. **Frontend**:
   - Add component in `frontend/src/components/`
   - Add page in `frontend/src/pages/`
   - Update routing in `frontend/src/App.tsx`

3. **Shared Types**:
   - Add types in `shared/src/types/index.ts`
   - Rebuild shared package: `cd shared && npm run build`

## Security Checklist

Before deploying or committing:

- [ ] No API keys in code
- [ ] .env is in .gitignore
- [ ] No sensitive data in logs
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation on all endpoints
- [ ] Error messages don't expose internals

## Documentation

- **README.md** - User-facing documentation
- **ARCHITECTURE.md** - System architecture details
- **AGENTS.md** - This file - agent guidelines
- **Code comments** - Explain non-obvious logic

## Contact

For questions about the project, refer to the documentation or check the code comments for specific implementation details.

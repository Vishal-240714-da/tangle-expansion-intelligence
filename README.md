# TANGLE Expansion Intelligence

AI-powered, evidence-grounded business expansion decision-support platform for independent café owners.

## Overview

TANGLE (Transparent Analysis of Natural and Geographic Linked Evidence) helps café operators evaluate expansion opportunities by combining cultural affinity signals, geographic context, business assumptions, concept exploration, scenario comparison, and risk assessment.

**Key Principle**: TANGLE is a decision-support tool, not an autonomous decision-maker. It distinguishes actual evidence from assumptions, synthetic examples, heuristics, and AI-generated hypotheses.

## Features

- **Evidence Collection & Provenance**: Retrieves cultural and geographic data via Qloo v2 Insights API (`/v2/insights`) with honest provenance tracking (`live-qloo`, `cached-qloo`, `demo-fixture`)
- **Conservative Geographic Validation**: Strict multi-tier matching (exact city match, metro area matching, district rejection) preventing suburban/district entities from being falsely marked as local city proper
- **Confidence Scoring & Abstention**: Transparent confidence metrics with explicit abstention warnings when evidence coverage or local signal density is insufficient
- **Evidence-to-Decision Graph**: Concept hypotheses and risk factors explicitly link to supporting evidence entity IDs for end-to-end traceability
- **Culture-to-Café Concept Generator**: Generates grounded concept hypotheses clearly labelled as requiring commercial validation
- **Expansion Risk Radar**: Categorizes operational, cultural, regulatory, and market risks with severity rankings and validation recommendations
- **Interactive What-If Scenario Simulator**: Real-time editable financial sliders (footfall, average transaction value, rent, staffing, ingredient costs) with live delta calculations vs. baseline
- **Resilient Dual Storage Architecture**: Operates seamlessly in memory when PostgreSQL is unconfigured or unavailable, with automatic schema initialization when `DATABASE_URL` is provided

## Non-Negotiable Principles

1. **Never fabricate live evidence** — only use actual Qloo API responses or honest synthetic demo fixtures.
2. **Never expose API credentials** — keys and tokens remain strictly server-side.
3. **Never treat global affinity as local demand** — global patterns do not prove local market viability.
4. **Never treat affinity as probability of commercial success** — cultural resonance indicates affinity, not business solvency.
5. **Never treat a state or district match alone as proof of an exact city match** — suburban or district entities (e.g. Egattur, Kanathur) are not labeled as verified city proper.
6. **Never automatically mark geographically uncertain entities as verified** — entities missing explicit city confirmation remain conservative partial-matches or no-matches.
7. **Never conceal missing data or uncertainty** — transparently abstain when evidence is sparse, and honestly distinguish `live-qloo` from `cached-qloo`.
8. **Never silently fall back to demo data** — analysis-level provenance always reflects actual execution data source.

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL (optional for persistence)
- Qloo API integration
- Zod for validation

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

## Project Structure

```
pro/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── __tests__/      # Backend test suites (services & routes)
│   │   ├── middleware/     # Error handling & security middleware
│   │   ├── models/         # Database models & in-memory store
│   │   ├── routes/         # Express API routes (health, analysis, scenarios, reports)
│   │   ├── services/       # Core business logic (analysis, Qloo, confidence, risk, etc.)
│   │   │   └── qloo/       # Qloo v2 Insights API integration
│   │   ├── types/          # TypeScript types
│   │   └── index.ts        # Express entry point
│   ├── .env.example        # Backend environment template
│   ├── .eslintrc.js        # ESLint configuration
│   ├── jest.config.js      # Jest configuration
│   ├── package.json        # Backend package manifest
│   └── tsconfig.json       # TypeScript configuration
├── frontend/                # React/Vite dashboard application
│   ├── src/
│   │   ├── __tests__/      # Frontend test suites (response handling)
│   │   ├── components/     # UI components (dashboard, layout, common)
│   │   ├── pages/          # AnalysisForm and AnalysisDashboard views
│   │   ├── types/          # Frontend TypeScript definitions
│   │   ├── App.tsx         # Main application routes
│   │   ├── main.tsx        # React DOM entry point
│   │   └── index.css       # Tailwind CSS styles
│   ├── .eslintrc.cjs       # Frontend ESLint configuration
│   ├── index.html          # HTML entry template
│   ├── package.json        # Frontend package manifest
│   ├── postcss.config.js   # PostCSS configuration
│   ├── tailwind.config.js  # Tailwind CSS configuration
│   ├── tsconfig.json       # Frontend TypeScript configuration
│   └── vite.config.ts      # Vite bundler configuration
├── shared/                  # Shared TypeScript types
│   ├── src/
│   │   └── types/          # Canonical cross-workspace types
│   ├── package.json        # Shared package manifest
│   └── tsconfig.json       # Shared TypeScript configuration
├── .env.example             # Root environment template
├── .gitignore               # Version control exclusion rules
├── AGENTS.md                # AI agent operating guidelines
├── ARCHITECTURE.md          # System architecture & data flow documentation
├── package-lock.json        # Locked dependency tree
├── package.json             # Root npm workspace manifest
└── README.md                # Project documentation and setup guide
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL (optional, for persistence)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tangle-expansion-intelligence
```

2. Install dependencies:
```bash
npm install
```

This will install dependencies for all workspaces (backend, frontend, shared).

### Configuration

1. Copy the backend environment template:
```bash
cp backend/.env.example backend/.env
```

2. Configure environment variables in `backend/.env`:

Edit `backend/.env` with your values. The template shows all available options:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (optional - required for persistence)
DATABASE_URL=postgresql://user:password@localhost:5432/tangle

# Qloo API Configuration - Hackathon
QLOO_API_KEY=your_qloo_api_key_here
QLOO_BASE_URL=https://hackathon.api.qloo.com

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache Configuration
CACHE_TTL_SECONDS=3600
```

> **Security note**: The `.env` file is never committed to version control. Add your own `QLOO_API_KEY` locally. The application runs in demo mode when the key is absent.

### Running the Application

#### Development Mode

Run both backend and frontend concurrently:

```bash
npm run dev
```

This starts:
- Backend API on http://localhost:3000
- Frontend on http://localhost:5173

#### Backend Only

```bash
npm run dev:backend
```

#### Frontend Only

```bash
npm run dev:frontend
```

### Building for Production

```bash
npm run build
```

This builds both backend and frontend.

### Running Tests

```bash
npm test
```

This runs tests for both backend and frontend.

## Usage

### Demo Mode (No API Key Required)

1. Navigate to http://localhost:5173
2. Select "Demo Mode" in the data mode dropdown
3. Enter a target city (e.g., "Coimbatore")
4. Click "Generate Analysis"
5. Review the results dashboard

**Note**: Demo mode uses synthetic data for demonstration only. Do not use for actual business decisions.

### Live Mode (Requires Qloo API Key)

1. Configure `QLOO_API_KEY` in `backend/.env`
2. Select "Live Mode" in the data mode dropdown
3. Enter your brand name and target city
4. Click "Generate Analysis"
5. Review the results dashboard

## API Endpoints

### Health Check
```
GET /api/health
```

### Analysis
```
POST /api/analysis
GET /api/analysis/:id
```

### Scenarios
```
POST /api/scenarios
POST /api/scenarios/compare
GET /api/scenarios/analysis/:analysisId
```

### Reports
```
POST /api/reports
GET /api/reports/analysis/:analysisId
```

## Database Setup (Optional)

The application works without a database for in-memory analysis. To enable persistence:

1. Install PostgreSQL
2. Create a database:
```sql
CREATE DATABASE tangle;
```
3. Configure `DATABASE_URL` in `backend/.env`
4. The database schema will be auto-initialized on server startup

## Testing

Critical components have automated tests covering:

- Geographic validation (preventing non-local evidence as local)
- Confidence scoring and abstention logic
- Demo data labeling (never as live evidence)
- Global affinity interpretation (not as local demand)

Run tests:
```bash
npm test
```

## Security

- API keys are server-side only, never exposed to frontend
- Environment variables are never committed to Git
- CORS is restricted to configured origins
- Rate limiting prevents API abuse
- Input validation on all endpoints
- Helmet for security headers

## Limitations

- Demo mode uses synthetic data - not suitable for business decisions
- Geographic validation requires Qloo to return accurate metadata
- Confidence scores reflect evidence quality, not success probability
- Financial projections require user-provided assumptions
- Neighborhood-level analysis may not be available for all cities

## License

This project was developed as a hackathon submission. No formal open-source license has been specified; all rights are reserved by the authors unless otherwise stated.

## Contributing

This repository is a finalized hackathon submission. Public contributions and pull requests are not currently accepted.

## Support

This project is provided as-is for hackathon evaluation and demonstration. No formal support channels or SLA are maintained. For evaluation questions, please refer to the project documentation (`README.md`, `ARCHITECTURE.md`, `AGENTS.md`).

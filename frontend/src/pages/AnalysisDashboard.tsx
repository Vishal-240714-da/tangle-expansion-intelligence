import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnalysisResult } from '../types';
import { AppShell } from '../components/layout/AppShell';
import { KPICard } from '../components/common/KPICard';
import { ConfidenceMeter } from '../components/dashboard/ConfidenceMeter';
import { EvidenceCategoryChart } from '../components/dashboard/EvidenceCategoryChart';
import { RiskCard } from '../components/dashboard/RiskCard';
import { ConceptCard } from '../components/dashboard/ConceptCard';
import { EvidenceTable } from '../components/dashboard/EvidenceTable';
import { GeographicBadge, DataSourceBadge } from '../components/common/Badge';
import {
  Sparkles,
  ShieldAlert,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Download,
  PlusCircle,
  HelpCircle,
  DollarSign,
  Calendar,
  RotateCcw,
  Database,
} from 'lucide-react';

export default function AnalysisDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loadedFromBrowserSession] = useState(() => {
    if (location.state || !id) return false;
    try {
      const cached = sessionStorage.getItem(`tangle_analysis_${id}`);
      if (cached) return true;
      const last = sessionStorage.getItem('tangle_last_analysis');
      return Boolean(last && (JSON.parse(last) as AnalysisResult).id === id);
    } catch {
      return false;
    }
  });

  // Retrieve initial analysis from location.state or session storage
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(() => {
    if (location.state) return location.state as AnalysisResult;
    if (id) {
      try {
        const cached = sessionStorage.getItem(`tangle_analysis_${id}`);
        if (cached) return JSON.parse(cached) as AnalysisResult;
        const last = sessionStorage.getItem('tangle_last_analysis');
        if (last) {
          const parsed = JSON.parse(last) as AnalysisResult;
          if (parsed && parsed.id === id) return parsed;
        }
      } catch (err) {
        console.warn('Session storage read skipped:', err);
      }
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (location.state) return false;
    if (id) {
      try {
        const cached = sessionStorage.getItem(`tangle_analysis_${id}`);
        if (cached) return false;
        const last = sessionStorage.getItem('tangle_last_analysis');
        if (last) {
          const parsed = JSON.parse(last) as AnalysisResult;
          if (parsed && parsed.id === id) return false;
        }
      } catch {
        // fallback to loading
      }
      return true;
    }
    return false;
  });

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  // What-If Simulation State
  const [simFootfall, setSimFootfall] = useState<number>(() => analysis?.businessInput.budgetAssumptions?.expectedFootfall || 0);
  const [simAtv, setSimAtv] = useState<number>(() => analysis?.businessInput.budgetAssumptions?.averageTransactionValue || 0);
  const [simRent, setSimRent] = useState<number>(() => analysis?.businessInput.budgetAssumptions?.monthlyRent || 0);
  const [simStaffing, setSimStaffing] = useState<number>(() => analysis?.businessInput.budgetAssumptions?.staffingCosts || 0);
  const [simIngredient, setSimIngredient] = useState<number>(() => analysis?.businessInput.budgetAssumptions?.ingredientCosts || 0);

  // Sync simulation defaults if analysis loads later
  useEffect(() => {
    if (analysis?.businessInput.budgetAssumptions) {
      const b = analysis.businessInput.budgetAssumptions;
      if (b.expectedFootfall) setSimFootfall(b.expectedFootfall);
      if (b.averageTransactionValue) setSimAtv(b.averageTransactionValue);
      if (b.monthlyRent) setSimRent(b.monthlyRent);
      if (b.staffingCosts) setSimStaffing(b.staffingCosts);
      if (b.ingredientCosts) setSimIngredient(b.ingredientCosts);
    }
  }, [analysis]);

  // Direct fetch fallback if user refreshed or opened /analysis/:id directly
  useEffect(() => {
    if (analysis) {
      try {
        sessionStorage.setItem(`tangle_analysis_${analysis.id}`, JSON.stringify(analysis));
        sessionStorage.setItem('tangle_last_analysis', JSON.stringify(analysis));
      } catch {
        // storage quota ignored
      }
      return;
    }

    if (!id) return;

    let isMounted = true;
    setLoading(true);
    setFetchError(null);

    const loadAnalysisRecord = async () => {
      try {
        const res = await fetch(`/api/analysis/${id}`);
        let text = '';
        try {
          text = await res.text();
        } catch {
          text = '';
        }

        let json: { data?: AnalysisResult; message?: string; error?: string } | null = null;
        if (text.trim().length > 0) {
          try {
            json = JSON.parse(text);
          } catch {
            // response is not JSON
          }
        }

        if (!isMounted) return;

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`Analysis record "${id}" was not found on the server.`);
          }
          const errorMsg =
            json?.message ||
            json?.error ||
            (text.trim().length > 0 && text.length < 250 && !text.includes('<html') ? text.trim() : null) ||
            `Server returned HTTP ${res.status} (${res.statusText || 'Error'})`;
          throw new Error(errorMsg);
        }

        if (!json || typeof json !== 'object' || !json.data) {
          throw new Error('Received an empty or invalid analysis response from the server.');
        }

        const analysisData = json.data;
        setAnalysis(analysisData);
        try {
          sessionStorage.setItem(`tangle_analysis_${analysisData.id}`, JSON.stringify(analysisData));
          sessionStorage.setItem('tangle_last_analysis', JSON.stringify(analysisData));
        } catch {
          // ignore
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(err instanceof Error ? err.message : 'Unable to retrieve analysis');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadAnalysisRecord();

    return () => {
      isMounted = false;
    };
  }, [id, analysis]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tangle-expansion-${analysis.businessInput.targetCity.toLowerCase()}-${analysis.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Loading skeleton state
  if (loading) {
    return (
      <AppShell title="Loading Analysis...">
        <div className="space-y-6 animate-pulse">
          <div className="h-10 bg-slate-200 rounded-lg w-1/3 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-xl" />
          <div className="h-80 bg-slate-200 rounded-xl" />
        </div>
      </AppShell>
    );
  }

  // Missing or Error state
  if (!analysis) {
    let lastSessionAnalysis: AnalysisResult | null = null;
    try {
      const stored = sessionStorage.getItem('tangle_last_analysis');
      if (stored) {
        lastSessionAnalysis = JSON.parse(stored);
      }
    } catch {
      lastSessionAnalysis = null;
    }

    return (
      <AppShell title="Analysis Not Found">
        <div className="max-w-lg mx-auto py-12 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center mb-5 shadow-sm">
            <HelpCircle className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Analysis Record Unavailable
          </h2>

          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            {fetchError || `We could not retrieve analysis record "${id}".`}
          </p>

          {/* Database Persistence Explanation Banner */}
          <div className="mt-5 p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-left text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Database className="w-4 h-4 text-slate-500" />
              <span>Database Persistence Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              PostgreSQL persistence is currently not configured (<code className="font-mono text-[10px] bg-slate-200 px-1 py-0.5 rounded">DATABASE_URL</code> is unset). Analyses are held in-memory during active backend runtime and in client session storage.
            </p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              If the backend server was restarted or this link was opened in a fresh browser session without an active local cache, the record cannot be reconstructed.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Analysis</span>
            </button>

            {lastSessionAnalysis && (
              <button
                onClick={() => {
                  setAnalysis(lastSessionAnalysis);
                  navigate(`/analysis/${lastSessionAnalysis.id}`, { state: lastSessionAnalysis });
                }}
                className="btn-secondary"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Restore Session Analysis ({lastSessionAnalysis.businessInput.targetCity})</span>
              </button>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  // Pre-calculate risk summaries
  const criticalCount = analysis.risks.filter((r) => r.severity === 'critical').length;
  const highCount = analysis.risks.filter((r) => r.severity === 'high').length;
  const mediumCount = analysis.risks.filter((r) => r.severity === 'medium').length;
  const lowCount = analysis.risks.filter((r) => r.severity === 'low').length;

  const filteredRisks = analysis.risks.filter((r) => {
    if (riskFilter === 'all') return true;
    return r.severity === riskFilter;
  });

  // Calculate financial highlights if provided
  const budget = analysis.businessInput.budgetAssumptions;
  const hasCompleteFinancialInputs = [
    budget?.expectedFootfall,
    budget?.averageTransactionValue,
    budget?.monthlyRent,
    budget?.staffingCosts,
    budget?.ingredientCosts,
  ].every((value) => typeof value === 'number' && Number.isFinite(value));
  const estimatedMonthlyRevenue =
    hasCompleteFinancialInputs
      ? (budget?.expectedFootfall ?? 0) * (budget?.averageTransactionValue ?? 0) * 30
      : null;
  const estimatedMonthlyExpenses =
    hasCompleteFinancialInputs
      ? (budget?.monthlyRent ?? 0) + (budget?.staffingCosts ?? 0) + (budget?.ingredientCosts ?? 0) + (budget?.marketingBudget ?? 0)
      : null;
  const estimatedGrossOperatingMargin =
    estimatedMonthlyRevenue !== null && estimatedMonthlyExpenses !== null
      ? estimatedMonthlyRevenue - estimatedMonthlyExpenses
      : null;

  // Real-time What-If Simulation metrics
  const simMonthlyRevenue = simFootfall * simAtv * 30;
  const simMonthlyExpenses = simRent + simStaffing + simIngredient + (budget?.marketingBudget ?? 0);
  const simGrossOperatingMargin = simMonthlyRevenue - simMonthlyExpenses;
  const simBreakEvenMonths = budget?.budget && simGrossOperatingMargin > 0
    ? Math.ceil(budget.budget / simGrossOperatingMargin)
    : null;
  const marginDelta = estimatedGrossOperatingMargin !== null
    ? simGrossOperatingMargin - estimatedGrossOperatingMargin
    : 0;

  return (
    <AppShell
      title={`Expansion Intelligence: ${analysis.businessInput.targetCity}`}
      targetCity={analysis.businessInput.targetCity}
      source={analysis.sourceIndicator.source}
      geographicMatchStatus={analysis.geographicMatchStatus}
      generatedAt={analysis.generatedAt}
      currentSection={activeTab}
      onSelectSection={setActiveTab}
      onPrint={handlePrint}
      onExport={handleExportJSON}
    >
      <div className="space-y-6 md:space-y-8">
        {/* Top Header Card */}
        <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-slate-50/50">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                <span>{analysis.businessInput.targetCity}</span>
              </span>
              <DataSourceBadge source={analysis.sourceIndicator.source} />
              <GeographicBadge status={analysis.geographicMatchStatus} />
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {analysis.businessInput.brandName
                ? `${analysis.businessInput.brandName} — Market Expansion Intelligence`
                : `${analysis.businessInput.targetCity} Cafe Market Expansion Model`}
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(analysis.generatedAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-400">
                ID: {analysis.id}
              </span>
              {analysis.businessInput.businessCategory && (
                <>
                  <span>•</span>
                  <span>{analysis.businessInput.businessCategory}</span>
                </>
              )}
              {loadedFromBrowserSession && (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                  Browser-saved analysis · pipeline {analysis.analysisMetadata?.pipelineVersion || 'version unavailable'}
                </span>
              )}
              {!loadedFromBrowserSession && analysis.analysisMetadata?.pipelineVersion && (
                <span className="text-[10px] text-slate-400">Pipeline {analysis.analysisMetadata.pipelineVersion}</span>
              )}
              {analysis.analysisMetadata?.retrieval && (
                <span className="text-[10px] text-slate-400" title={JSON.stringify(analysis.analysisMetadata.retrieval.parameters)}>
                  Qloo {analysis.analysisMetadata.retrieval.cacheStatus} · data {new Date(analysis.analysisMetadata.retrieval.dataTimestamp).toLocaleString()} · category filter {analysis.analysisMetadata.retrieval.categoryFilterApplied ? 'applied' : 'not applied'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 no-print self-start md:self-auto">
            <button
              onClick={handlePrint}
              className="btn-secondary py-2 px-3 text-xs"
              title="Print Expansion Brief"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Print Report</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="btn-secondary py-2 px-3 text-xs"
              title="Export Raw Intelligence JSON"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-primary py-2 px-3 text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Analysis</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Confidence Score KPI */}
          <KPICard
            title="Grounding Confidence"
            value={`${analysis.confidence.score}/100`}
            subtitle={analysis.confidence.factors.geographicMatch}
            icon={<Sparkles className="w-4 h-4 text-brand-600" />}
            badge={
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  analysis.confidence.score >= 80
                    ? 'bg-emerald-50 text-emerald-700'
                    : analysis.confidence.score >= 60
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {analysis.confidence.score >= 80 ? 'High' : analysis.confidence.score >= 60 ? 'Moderate' : 'Low / Abstain'}
              </span>
            }
            accentColor={analysis.confidence.score >= 70 ? 'emerald' : 'amber'}
            footer={
              <div className="text-[11px] text-slate-500 flex justify-between">
                <span>Source Quality:</span>
                <span className="font-medium text-slate-800">{analysis.confidence.factors.sourceQuality}</span>
              </div>
            }
          />

          {/* Geographic Validation KPI */}
          <KPICard
            title="Geographic Telemetry"
            value={analysis.geographicMatchStatus.replace('-', ' ')}
            subtitle={`${analysis.evidenceCoverage.verifiedLocal} verified local · ${analysis.evidenceCoverage.geographyBreakdown?.['partial-match'] ?? 0} partial · ${analysis.evidenceCoverage.geographyBreakdown?.global ?? 0} global · ${analysis.evidenceCoverage.geographyBreakdown?.['unknown-geography'] ?? 0} unknown · ${analysis.evidenceCoverage.geographyBreakdown?.['no-match'] ?? 0} mismatched`}
            icon={<MapPin className="w-4 h-4 text-emerald-600" />}
            accentColor="emerald"
            footer={
              <div className="text-[11px] text-slate-500 flex justify-between">
                <span>Scope:</span>
                <span className="font-medium text-slate-800">
                  {analysis.businessInput.geographicScope === 'city' ? 'City-wide Market' : 'Neighborhood'}
                </span>
              </div>
            }
          />

          {/* Evidence Coverage KPI */}
          <KPICard
            title="Evidence Density"
            value={analysis.evidenceCoverage.totalEvidence}
            subtitle={`${Object.keys(analysis.evidenceCoverage.categories).length} cultural & business categories tracked`}
            icon={<Layers className="w-4 h-4 text-brand-600" />}
            accentColor="brand"
            footer={
              <div className="text-[11px] text-slate-500 flex justify-between">
                <span>Global Signals:</span>
                <span className="font-medium text-slate-800">{analysis.evidenceCoverage.globalOnly} non-local</span>
              </div>
            }
          />

          {/* Risk Profile KPI */}
          <KPICard
            title="Risk Assessment"
            value={`${analysis.risks.length} Risks`}
            subtitle={
              criticalCount > 0
                ? `${criticalCount} Critical risks require immediate field validation`
                : `${highCount} High risks identified for due diligence`
            }
            icon={<ShieldAlert className="w-4 h-4 text-rose-600" />}
            accentColor={criticalCount > 0 ? 'rose' : highCount > 0 ? 'amber' : 'slate'}
            footer={
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold font-mono">
                  {criticalCount} Critical
                </span>
                <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-bold font-mono">
                  {highCount} High
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold font-mono">
                  {mediumCount} Med
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold font-mono">
                  {lowCount} Low
                </span>
              </div>
            }
          />
        </div>

        {/* Section Navigation Tabs */}
        <div className="border-b border-slate-200 no-print">
          <nav className="flex space-x-6 overflow-x-auto pb-px" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Overview & Synthesis' },
              { id: 'findings', label: `Key Findings (${analysis.keyFindings.length})` },
              { id: 'concepts', label: `Concept Hypotheses (${analysis.conceptHypotheses.length})` },
              { id: 'risks', label: `Risk Radar (${analysis.risks.length})` },
              { id: 'evidence', label: `Evidence Table (${analysis.evidence.length})` },
              { id: 'financials', label: 'Financial Assumptions' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB CONTENT: Overview & Synthesis */}
        {(activeTab === 'overview' || activeTab === 'findings') && (
          <div className="space-y-6">
            {/* Confidence Gauge & Category Chart in 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <ConfidenceMeter confidence={analysis.confidence} />
              </div>
              <div className="lg:col-span-5">
                <EvidenceCategoryChart
                  categories={analysis.evidenceCoverage.categories}
                  totalEvidence={analysis.evidenceCoverage.totalEvidence}
                  verifiedLocal={analysis.evidenceCoverage.verifiedLocal}
                  globalOnly={analysis.evidenceCoverage.globalOnly}
                />
              </div>
            </div>

            {/* Key Findings Card */}
            <div className="card">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Key Market Findings & Synthesis
                    </h3>
                    <p className="text-xs text-slate-500">
                      Grounded synthesis from geographic matching and behavioral affinity telemetry
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {analysis.keyFindings.length} FINDINGS
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.keyFindings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-slate-50/70 border border-slate-200/60 hover:bg-white hover:border-slate-300 transition-all flex items-start gap-3 shadow-subtle"
                  >
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-mono font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-slate-800 leading-relaxed font-normal">
                      {finding}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Validations Roadmap */}
            {analysis.recommendedValidations && analysis.recommendedValidations.length > 0 && (
              <div className="card bg-gradient-to-br from-white to-slate-50">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Recommended Field Validation Steps
                    </h3>
                    <p className="text-xs text-slate-500">
                      Actionable due-diligence tasks to verify hypotheses before committing capital
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {analysis.recommendedValidations.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-200/80 shadow-subtle"
                    >
                      <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Limitations Notice */}
            {analysis.limitations && analysis.limitations.length > 0 && (
              <div className="card border-amber-200/80 bg-amber-50/30">
                <div className="flex items-center gap-2 pb-3 border-b border-amber-200/60">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-amber-950 tracking-tight">
                    Critical Methodological Limitations
                  </h3>
                </div>
                <div className="mt-3 space-y-1.5">
                  {analysis.limitations.map((lim, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-amber-900">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{lim}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: Concept Hypotheses */}
        {(activeTab === 'concepts' || activeTab === 'overview') && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Café Concept Hypotheses
                </h3>
                <p className="text-xs text-slate-500">
                  Data-driven concept archetypes formulated from cultural affinity signals. All concepts require local field validation.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {analysis.conceptHypotheses.length} CONCEPTS FORMULATED
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {analysis.conceptHypotheses.map((concept) => (
                <ConceptCard key={concept.id} concept={concept} />
              ))}
            </div>
          </div>
        )}

        {/* TAB CONTENT: Risk Assessment & Radar */}
        {(activeTab === 'risks' || activeTab === 'overview') && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Expansion Risk Radar
                </h3>
                <p className="text-xs text-slate-500">
                  Transparent identification of operational uncertainties, missing market data, and business risks.
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-print">
                {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setRiskFilter(sev)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                      riskFilter === sev
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRisks.map((risk) => (
                <RiskCard key={risk.id} risk={risk} />
              ))}
            </div>
          </div>
        )}

        {/* TAB CONTENT: Evidence Table */}
        {(activeTab === 'evidence' || activeTab === 'overview') && (
          <div className="space-y-4">
            <EvidenceTable evidence={analysis.evidence} />
          </div>
        )}

        {/* TAB CONTENT: Financial Assumptions */}
        {(activeTab === 'financials' || activeTab === 'overview') && (
          <div className="card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Financial Assumptions & Sensitivity Preview
                  </h3>
                  <p className="text-xs text-slate-500">
                    User-configured economic parameters and baseline unit economics
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                WHAT-IF ENGINE
              </span>
            </div>

            {budget ? (
              <div className="mt-4 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Capital Budget</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {budget.budget ? `₹${budget.budget.toLocaleString()}` : 'Not set'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Monthly Rent</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {budget.monthlyRent ? `₹${budget.monthlyRent.toLocaleString()}` : 'Not set'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Daily Footfall</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {budget.expectedFootfall ? `${budget.expectedFootfall} guests` : 'Not set'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Avg Ticket (ATV)</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {budget.averageTransactionValue ? `₹${budget.averageTransactionValue}` : 'Not set'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Monthly Staffing</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {budget.staffingCosts ? `₹${budget.staffingCosts.toLocaleString()}` : 'Not set'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Ingredient Costs</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {budget.ingredientCosts ? `₹${budget.ingredientCosts.toLocaleString()}` : 'Not set'}
                    </span>
                  </div>
                </div>

                {/* Calculated Economics Card */}
                {estimatedMonthlyRevenue !== null && estimatedMonthlyExpenses !== null && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-brand-900 to-indigo-950 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-brand-300">
                          Scenario arithmetic from user assumptions
                        </span>
                        <div className="mt-1 flex items-baseline gap-4">
                          <div>
                            <span className="text-xs text-slate-300 block">Monthly Revenue Arithmetic</span>
                            <span className="text-xl font-bold font-mono">
                              ₹{estimatedMonthlyRevenue.toLocaleString()}
                            </span>
                          </div>
                          <span className="text-slate-400">−</span>
                          <div>
                            <span className="text-xs text-slate-300 block">Operating Costs</span>
                            <span className="text-xl font-bold font-mono text-slate-300">
                              ₹{estimatedMonthlyExpenses.toLocaleString()}
                            </span>
                          </div>
                          <span className="text-slate-400">=</span>
                          <div>
                            <span className="text-xs text-brand-300 block">Gross Operating Margin</span>
                            <span className={`text-xl font-bold font-mono ${
                              (estimatedGrossOperatingMargin || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              ₹{(estimatedGrossOperatingMargin || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <span className="mt-2 block text-[10px] text-slate-400">Uses entered rent, staffing, ingredients, and marketing assumptions when provided; utilities, taxes, maintenance, and other unentered costs are excluded.</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-300 block">
                          Based on {budget.expectedFootfall} daily guests @ ₹{budget.averageTransactionValue} ATV
                        </span>
                        <span className="text-[10px] text-slate-400 italic">
                          * Illustrative calculation only; not a local market forecast
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {!hasCompleteFinancialInputs && (
                  <div className="p-4 text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                    Enter daily footfall, average ticket, rent, staffing, and ingredient costs to calculate scenario arithmetic. No market defaults are supplied.
                  </div>
                )}

                {/* Interactive What-If Scenario Simulator */}
                {hasCompleteFinancialInputs && (
                <div className="p-5 rounded-xl bg-slate-900 text-white space-y-5 border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs">
                        ⚡
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-tight">
                          Live What-If Expansion Simulator
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Adjust hypothetical parameters to test unit economics sensitivity
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (budget) {
                          setSimFootfall(budget.expectedFootfall || 0);
                          setSimAtv(budget.averageTransactionValue || 0);
                          setSimRent(budget.monthlyRent || 0);
                          setSimStaffing(budget.staffingCosts || 0);
                          setSimIngredient(budget.ingredientCosts || 0);
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-400" />
                      <span>Reset to Baseline</span>
                    </button>
                  </div>

                  {/* Sliders & Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Footfall */}
                    <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">Daily Footfall</span>
                        <span className="font-mono font-bold text-white text-sm">{simFootfall} guests</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="500"
                        step="10"
                        value={simFootfall}
                        onChange={(e) => setSimFootfall(Number(e.target.value))}
                        className="w-full accent-brand-500 cursor-pointer"
                      />
                        <span className="text-[10px] text-slate-500 block">Baseline: {budget?.expectedFootfall}</span>
                    </div>

                    {/* ATV */}
                    <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">Avg Ticket Value (ATV)</span>
                        <span className="font-mono font-bold text-white text-sm">₹{simAtv}</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="1200"
                        step="25"
                        value={simAtv}
                        onChange={(e) => setSimAtv(Number(e.target.value))}
                        className="w-full accent-brand-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 block">Baseline: ₹{budget?.averageTransactionValue}</span>
                    </div>

                    {/* Monthly Rent */}
                    <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">Monthly Rent</span>
                        <span className="font-mono font-bold text-white text-sm">₹{simRent.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="20000"
                        max="250000"
                        step="5000"
                        value={simRent}
                        onChange={(e) => setSimRent(Number(e.target.value))}
                        className="w-full accent-brand-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 block">Baseline: ₹{(budget?.monthlyRent || 0).toLocaleString()}</span>
                    </div>

                    {/* Staffing Costs */}
                    <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">Staffing Costs</span>
                        <span className="font-mono font-bold text-white text-sm">₹{simStaffing.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="25000"
                        max="250000"
                        step="5000"
                        value={simStaffing}
                        onChange={(e) => setSimStaffing(Number(e.target.value))}
                        className="w-full accent-brand-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 block">Baseline: ₹{(budget?.staffingCosts || 0).toLocaleString()}</span>
                    </div>

                    {/* Ingredient Costs */}
                    <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">Ingredient Costs</span>
                        <span className="font-mono font-bold text-white text-sm">₹{simIngredient.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min="20000"
                        max="250000"
                        step="5000"
                        value={simIngredient}
                        onChange={(e) => setSimIngredient(Number(e.target.value))}
                        className="w-full accent-brand-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 block">Baseline: ₹{(budget?.ingredientCosts || 0).toLocaleString()}</span>
                    </div>

                    {/* Simulation Result KPI Box */}
                    <div className="p-3 bg-gradient-to-br from-brand-950 to-indigo-950 rounded-lg border border-brand-800/80 space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-brand-300">
                        Simulated Monthly Margin
                      </span>
                      <div className={`text-xl font-bold font-mono ${simGrossOperatingMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{simGrossOperatingMargin.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span>vs Baseline:</span>
                        <span className={`font-mono font-bold ${marginDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {marginDelta >= 0 ? `+₹${marginDelta.toLocaleString()}` : `-₹${Math.abs(marginDelta).toLocaleString()}`}
                        </span>
                      </div>
                      {simBreakEvenMonths !== null && (
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          Illustrative payback arithmetic: <span className="font-mono text-white font-semibold">{simBreakEvenMonths} months</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )}
              </div>
            ) : (
              <div className="mt-4 p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                No financial parameters were entered for this analysis.
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

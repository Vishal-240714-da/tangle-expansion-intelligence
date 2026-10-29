import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessInput, AnalysisResult } from '../types';
import { AppShell } from '../components/layout/AppShell';
import {
  Sparkles,
  MapPin,
  Coffee,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

const legacyConceptDefaults = {
  cafeConcept: 'A design-forward specialty coffee shop focusing on single-origin pour-overs, artisan bakes, and quiet work spaces.',
  targetAudience: 'Remote tech professionals, college students, and third-wave coffee enthusiasts.',
  menuDirection: 'Single-origin espresso, manual pour-overs, sourdough tartines, and gluten-free pastries.',
  experienceStrategy: 'Warm minimalist interior, community table with charging ports, ambient acoustic music, and barista brewing counter.',
};

function restorePersistedInputs(parsed: Partial<BusinessInput>): Partial<BusinessInput> {
  const restored = { ...parsed };
  (Object.keys(legacyConceptDefaults) as Array<keyof typeof legacyConceptDefaults>).forEach((field) => {
    if (restored[field] === legacyConceptDefaults[field]) restored[field] = '';
  });

  const legacyBudgetDefaults: Record<string, number> = {
    budget: 5000000, monthlyRent: 55000, expectedFootfall: 120,
    averageTransactionValue: 280, staffingCosts: 140000, ingredientCosts: 85000,
  };
  const assumptions = { ...(restored.budgetAssumptions || {}) };
  Object.entries(legacyBudgetDefaults).forEach(([field, oldValue]) => {
    const key = field as keyof typeof assumptions;
    if (assumptions[key] === oldValue) delete assumptions[key];
  });
  restored.budgetAssumptions = assumptions;
  restored.dataMode = parsed.dataMode === 'demo' ? 'demo' : 'live';
  return restored;
}

export default function AnalysisForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<BusinessInput>>(() => {
    try {
      const saved = sessionStorage.getItem('tangle_form_inputs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.targetCity) {
          return restorePersistedInputs(parsed);
        }
      }
    } catch {
      // fallback to defaults
    }
    return {
      brandName: '',
      targetCity: 'Coimbatore',
      businessCategory: 'Specialty Coffee & Roastery',
      cafeConcept: '',
      targetAudience: '',
      menuDirection: '',
      experienceStrategy: '',
      geographicScope: 'city',
      dataMode: 'live',
      budgetAssumptions: {
        budget: undefined,
        monthlyRent: undefined,
        expectedFootfall: undefined,
        averageTransactionValue: undefined,
        staffingCosts: undefined,
        ingredientCosts: undefined,
      },
    };
  });

  const cityPresets = [
    { name: 'Coimbatore', tag: 'Benchmark Market' },
    { name: 'Bengaluru', tag: 'Tech Hub' },
    { name: 'Chennai', tag: 'Metro' },
    { name: 'Kochi', tag: 'Emerging' },
    { name: 'Pune', tag: 'Student / Tech' },
  ];

  const categoryPresets = [
    'Specialty Coffee & Roastery',
    'Artisan Bakery & Cafe',
    'Hybrid Work & Community Cafe',
    'Tea Lounge & Dessert Bar',
    'Health-Conscious All-Day Cafe',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      let responseText = '';
      try {
        responseText = await response.text();
      } catch {
        responseText = '';
      }

      let responseJson: { data?: AnalysisResult; message?: string; error?: string } | null = null;
      if (responseText.trim().length > 0) {
        try {
          responseJson = JSON.parse(responseText);
        } catch {
          // Response is not JSON
        }
      }

      if (!response.ok) {
        let errorMessage = '';
        if (responseJson && typeof responseJson === 'object' && (responseJson.message || responseJson.error)) {
          errorMessage = responseJson.message || responseJson.error || '';
        } else if (responseText.trim().length > 0 && responseText.length < 250 && !responseText.includes('<html')) {
          errorMessage = responseText.trim();
        } else if (response.status === 429) {
          errorMessage = 'Rate limit reached. Please wait a few moments before trying again.';
        } else if (response.status === 404) {
          errorMessage = 'The analysis endpoint was not found (HTTP 404).';
        } else if (response.status >= 500) {
          errorMessage = `Backend server error (HTTP ${response.status}). Please verify the backend service is running.`;
        } else {
          errorMessage = `Analysis generation failed (HTTP ${response.status}: ${response.statusText || 'Error'}).`;
        }
        throw new Error(errorMessage);
      }

      if (!responseJson || typeof responseJson !== 'object' || !responseJson.data) {
        throw new Error('Server returned an empty or invalid analysis response.');
      }

      const analysisData = responseJson.data;

      // Cache analysis and form values into session storage
      try {
        sessionStorage.setItem(`tangle_analysis_${analysisData.id}`, JSON.stringify(analysisData));
        sessionStorage.setItem('tangle_last_analysis', JSON.stringify(analysisData));
        sessionStorage.setItem('tangle_form_inputs', JSON.stringify(formData));
      } catch (storageErr) {
        console.warn('Session storage write skipped:', storageErr);
      }

      navigate(`/analysis/${analysisData.id}`, { state: analysisData });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBudgetChange = (field: string, value: string) => {
    const num = value === '' ? undefined : parseFloat(value);
    setFormData((prev) => ({
      ...prev,
      budgetAssumptions: {
        ...prev.budgetAssumptions,
        [field]: num,
      },
    }));
  };

  const handleReset = () => {
    try {
      sessionStorage.removeItem('tangle_form_inputs');
    } catch {
      // ignore
    }
    setFormData({
      targetCity: 'Coimbatore',
      geographicScope: 'city',
      dataMode: 'live',
      brandName: '',
      businessCategory: '',
      cafeConcept: '',
      targetAudience: '',
      menuDirection: '',
      experienceStrategy: '',
      budgetAssumptions: {
        budget: undefined,
        monthlyRent: undefined,
        expectedFootfall: undefined,
        averageTransactionValue: undefined,
        staffingCosts: undefined,
        ingredientCosts: undefined,
      },
    });
    setError(null);
  };

  // Live Unit Economics Calculation
  const footfall = formData.budgetAssumptions?.expectedFootfall || 0;
  const atv = formData.budgetAssumptions?.averageTransactionValue || 0;
  const rent = formData.budgetAssumptions?.monthlyRent || 0;
  const staff = formData.budgetAssumptions?.staffingCosts || 0;
  const ingredients = formData.budgetAssumptions?.ingredientCosts || 0;

  const estimatedMonthlyRevenue = footfall * atv * 30;
  const estimatedMonthlyExpenses = rent + staff + ingredients;
  const estimatedGrossOperatingMargin = estimatedMonthlyRevenue - estimatedMonthlyExpenses;
  const hasCompleteFinancialInputs = [footfall, atv, rent, staff, ingredients].every((value) => value > 0);

  return (
    <AppShell title="Configure Expansion Model">
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Header Hero */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Expansion Intelligence Engine</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">v1.0.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            New Market Expansion Analysis
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
            Input your target geography, concept hypothesis, and financial parameters to evaluate cultural affinities, assess geographic fit, and surface critical business risks.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                Analysis Request Failed
              </h4>
              <p className="mt-0.5 text-xs leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Geographic Target & Telemetry Scope */}
          <div className="card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    1. Target Geography & Data Telemetry
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define the market boundaries for cultural affinity retrieval and geographic matching
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                REQUIRED
              </span>
            </div>

            {/* Target City */}
            <div>
              <label className="label">
                Target City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="targetCity"
                value={formData.targetCity || ''}
                onChange={handleChange}
                className="input-field text-sm font-medium"
                placeholder="e.g., Coimbatore"
                required
              />

              {/* City quick-select pills */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Select:</span>
                {cityPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, targetCity: preset.name }))}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                      formData.targetCity === preset.name
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.name}
                    {preset.tag && (
                      <span className="ml-1 text-[9px] opacity-75">({preset.tag})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Geographic Scope & Data Mode in 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Geographic Scope */}
              <div>
                <label className="label">Geographic Analysis Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'city', title: 'City-wide Market', desc: 'Broader metropolitan coverage' },
                    { id: 'neighborhood', title: 'Neighborhood Specific', desc: 'Localized sub-market' },
                  ].map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setFormData((prev) => ({ ...prev, geographicScope: option.id as 'city' | 'neighborhood' }))}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.geographicScope === option.id
                          ? 'bg-brand-50/60 border-brand-500 text-brand-900 ring-1 ring-brand-500'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{option.title}</span>
                        {formData.geographicScope === option.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                        {option.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Mode */}
              <div>
                <label className="label">Telemetry Data Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'demo', title: 'Demo Fixtures', desc: 'Reproducible Coimbatore test suite', badge: 'Synthetic' },
                    { id: 'live', title: 'Live Qloo API', desc: 'Live cultural affinity telemetry', badge: 'API Key' },
                  ].map((mode) => (
                    <div
                      key={mode.id}
                      onClick={() => setFormData((prev) => ({ ...prev, dataMode: mode.id as 'demo' | 'live' }))}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.dataMode === mode.id
                          ? 'bg-indigo-50/60 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{mode.title}</span>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {mode.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                        {mode.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Brand & Concept Foundation */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    2. Brand & Concept Hypothesis
                  </h3>
                  <p className="text-xs text-slate-500">
                    Articulate your brand offering, menu direction, and intended experiential positioning
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Brand or Business Name (Optional)</label>
                <input
                  type="text"
                  name="brandName"
                  value={formData.brandName || ''}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., TANGLE Artisan Roasters"
                />
              </div>

              <div>
                <label className="label">Business Category (Optional)</label>
                <input
                  type="text"
                  name="businessCategory"
                  value={formData.businessCategory || ''}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., Specialty Coffee & Cafe"
                />
              </div>
            </div>

            {/* Category presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Suggestions:</span>
              {categoryPresets.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, businessCategory: cat }))}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>

            <div>
              <label className="label">Cafe Concept Core Vision (Optional)</label>
              <textarea
                name="cafeConcept"
                value={formData.cafeConcept || ''}
                onChange={handleChange}
                rows={2}
                className="input-field leading-relaxed"
                placeholder="Describe your cafe concept, value proposition, and unique selling points..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Target Audience (Optional)</label>
                <input
                  type="text"
                  name="targetAudience"
                  value={formData.targetAudience || ''}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., Tech remote workers, youth"
                />
              </div>

              <div>
                <label className="label">Menu Direction (Optional)</label>
                <input
                  type="text"
                  name="menuDirection"
                  value={formData.menuDirection || ''}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., Pour-overs, artisan sourdough"
                />
              </div>

              <div>
                <label className="label">Experience Strategy (Optional)</label>
                <input
                  type="text"
                  name="experienceStrategy"
                  value={formData.experienceStrategy || ''}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., Minimalist, work desks, calm acoustic"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financial & Economic Assumptions */}
          <div className="card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    3. Baseline Financial Assumptions
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure initial economic parameters for sensitivity analysis and break-even calculations
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                CURRENCY: INR (₹)
              </span>
            </div>

            <p className="text-xs text-slate-500">
              These are your scenario inputs, not city estimates. Changing the city or specialization keeps saved concept and financial assumptions; review them for each market.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Total Capital Budget (₹)</label>
                <input
                  type="number"
                  value={formData.budgetAssumptions?.budget ?? ''}
                  onChange={(e) => handleBudgetChange('budget', e.target.value)}
                  className="input-field font-mono"
                  placeholder="e.g., 5000000"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Fit-out, equipment, and runway</span>
              </div>

              <div>
                <label className="label">Estimated Monthly Rent (₹)</label>
                <input
                  type="number"
                  value={formData.budgetAssumptions?.monthlyRent ?? ''}
                  onChange={(e) => handleBudgetChange('monthlyRent', e.target.value)}
                  className="input-field font-mono"
                  placeholder="e.g., 50000"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Location lease expense</span>
              </div>

              <div>
                <label className="label">Expected Daily Footfall (Guests)</label>
                <input
                  type="number"
                  value={formData.budgetAssumptions?.expectedFootfall ?? ''}
                  onChange={(e) => handleBudgetChange('expectedFootfall', e.target.value)}
                  className="input-field font-mono"
                  placeholder="e.g., 120"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Daily unique paying customers</span>
              </div>

              <div>
                <label className="label">Avg Transaction Value (₹ / ticket)</label>
                <input
                  type="number"
                  value={formData.budgetAssumptions?.averageTransactionValue ?? ''}
                  onChange={(e) => handleBudgetChange('averageTransactionValue', e.target.value)}
                  className="input-field font-mono"
                  placeholder="e.g., 280"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Average ticket size</span>
              </div>

              <div>
                <label className="label">Monthly Staffing Costs (₹)</label>
                <input
                  type="number"
                  value={formData.budgetAssumptions?.staffingCosts ?? ''}
                  onChange={(e) => handleBudgetChange('staffingCosts', e.target.value)}
                  className="input-field font-mono"
                  placeholder="e.g., 140000"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Baristas, kitchen, supervisor</span>
              </div>

              <div>
                <label className="label">Monthly Ingredient Costs (₹)</label>
                <input
                  type="number"
                  value={formData.budgetAssumptions?.ingredientCosts ?? ''}
                  onChange={(e) => handleBudgetChange('ingredientCosts', e.target.value)}
                  className="input-field font-mono"
                  placeholder="e.g., 85000"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Coffee beans, dairy, packaging</span>
              </div>
            </div>

            {/* Dynamic Unit Economics Preview */}
            {hasCompleteFinancialInputs && (
              <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-brand-400">
                    Scenario Arithmetic Preview
                  </span>
                  <div className="mt-1 flex items-baseline gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Monthly Revenue</span>
                      <span className="text-base font-bold font-mono text-white">
                        ₹{estimatedMonthlyRevenue.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-slate-500">−</span>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Operating Costs</span>
                      <span className="text-base font-bold font-mono text-slate-300">
                        ₹{estimatedMonthlyExpenses.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-slate-500">=</span>
                    <div>
                      <span className="text-brand-300 block text-[11px]">Gross Operating Margin</span>
                      <span className={`text-base font-bold font-mono ${
                        estimatedGrossOperatingMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        ₹{estimatedGrossOperatingMargin.toLocaleString()} / mo
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400">
                  <span>Entered assumptions only; utilities and other unentered costs are excluded. Not a market forecast.</span>
                </div>
              </div>
            )}
          </div>

          {/* Core Principles & Integrity Guarantee */}
          <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200/80 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="font-semibold text-slate-900">TANGLE Evidence-First Guarantee: </strong>
              City status uses exact city metadata matches; uncertain and mismatched rows remain separate. TANGLE does not fabricate demand footfall or treat cultural affinity as commercial success.
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary py-2.5 px-4 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset to Defaults</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-2.5 px-6 text-xs text-white bg-brand-600 hover:bg-brand-700 shadow-md font-semibold"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <span>Synthesizing Intelligence...</span>
                </>
              ) : (
                <>
                  <span>Generate Expansion Intelligence</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

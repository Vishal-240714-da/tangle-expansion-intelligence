import React from 'react';
import { ConfidenceMetrics } from '../../types';
import { AlertTriangle } from 'lucide-react';

interface ConfidenceMeterProps {
  confidence: ConfidenceMetrics;
  className?: string;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({ confidence, className = '' }) => {
  const { score, explanation, factors, abstentionReason } = confidence;

  // Grade and color coding
  const getScoreTheme = (val: number) => {
    if (val >= 80) {
      return {
        badge: 'High Confidence Grounding',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barColor: 'bg-emerald-500',
        textColor: 'text-emerald-700',
      };
    }
    if (val >= 60) {
      return {
        badge: 'Moderate Grounding',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        barColor: 'bg-amber-500',
        textColor: 'text-amber-700',
      };
    }
    if (val >= 40) {
      return {
        badge: 'Low Empirical Evidence',
        badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
        barColor: 'bg-orange-500',
        textColor: 'text-orange-700',
      };
    }
    return {
      badge: 'Critical Evidence Gap / Abstention',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      barColor: 'bg-rose-500',
      textColor: 'text-rose-700',
    };
  };

  const theme = getScoreTheme(score);

  // Normalize factor value for visual bar (high, medium, low, good, recent, etc.)
  const getFactorPercent = (val: string, key: string) => {
    const scoreKey: Record<string, keyof NonNullable<ConfidenceMetrics['factorScores']>> = {
      sourceQuality: 'sourceQuality',
      geographicMatch: 'geographicCoverage',
      entityRelevance: 'categoryRelevance',
      dataFreshness: 'freshness',
      evidenceCompleteness: 'completeness',
    };
    const maxScore: Record<string, number> = {
      sourceQuality: 20, geographicCoverage: 25, categoryRelevance: 20, freshness: 15, completeness: 20,
    };
    const numeric = confidence.factorScores?.[scoreKey[key]];
    if (typeof numeric === 'number') return Math.round((numeric / maxScore[scoreKey[key]]) * 100);
    const lower = (val || '').toLowerCase();
    if (lower.includes('high') || lower.includes('verified') || lower.includes('fresh') || lower.includes('complete') || lower.includes('good')) return 90;
    if (lower.includes('partial') || lower.includes('medium') || lower.includes('moderate')) return 60;
    if (lower.includes('low') || lower.includes('stale') || lower.includes('limited')) return 35;
    return 50;
  };

  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Evidence Grounding & Confidence
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${theme.badgeColor}`}>
              {theme.badge}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Algorithmic confidence based on data provenance, geographic specificity, and entity relevance.
          </p>
        </div>

        {/* Big Score Display */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Evidence Quality Score
            </span>
            <span className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
              {score}
              <span className="text-slate-400 text-lg font-normal">/100</span>
            </span>
          </div>
        </div>
      </div>

      {/* Abstention Warning if applicable */}
      {abstentionReason && (
        <div className="mt-4 p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-semibold text-amber-950">System Abstention Notice: </strong>
            {abstentionReason}
          </div>
        </div>
      )}

      {/* Explanation text */}
      <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-700 leading-relaxed">
        <span className="font-semibold text-slate-900">Analysis Synthesis: </span>
        {explanation}
      </div>

      {/* 5 Confidence Factors breakdown */}
      <div className="mt-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Evidence Quality Breakdown
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Object.entries(factors).map(([key, val]) => {
            const labelMap: Record<string, string> = {
              sourceQuality: 'Source Quality',
              geographicMatch: 'Geographic Specificity',
              entityRelevance: 'Entity Relevance',
              dataFreshness: 'Data Freshness',
              evidenceCompleteness: 'Completeness',
            };
            const label = labelMap[key] || key;
            const percent = getFactorPercent(val, key);

            return (
              <div
                key={key}
                className="p-3 rounded-lg bg-white border border-slate-200/80 shadow-subtle flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] text-slate-500 font-medium truncate">
                    {label}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-900 truncate">
                    {val}
                  </div>
                </div>

                <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Core Principle Notice */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>* TANGLE measures empirical evidentiary grounding, never autonomous commercial success.</span>
        <span className="font-mono text-[10px]">EVIDENCE INTEGRITY</span>
      </div>
    </div>
  );
};

import React from 'react';
import { CafeConcept } from '../../types';
import { Coffee, Sparkles, FlaskConical, Users, Utensils, Compass } from 'lucide-react';

interface ConceptCardProps {
  concept: CafeConcept;
}

export const ConceptCard: React.FC<ConceptCardProps> = ({ concept }) => {
  return (
    <div className="card hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                {concept.name}
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">HYPOTHESIS REQUIRES VALIDATION</span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
            <Sparkles className="w-3 h-3 text-brand-500" />
            <span>AI Synthesis</span>
          </span>
        </div>

        {/* Target Audience */}
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200/60">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-1">
            <Users className="w-3.5 h-3.5 text-brand-600" />
            <span>Target Audience Hypothesis</span>
          </div>
          <p className="text-xs text-slate-800 leading-relaxed font-normal">
            {concept.targetAudienceHypothesis}
          </p>
        </div>

        {/* Menu & Experience Strategy 2-column grid */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white border border-slate-200/80 shadow-subtle">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-1">
              <Utensils className="w-3.5 h-3.5 text-amber-600" />
              <span>Menu Direction</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {concept.menuDirection}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-white border border-slate-200/80 shadow-subtle">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-1">
              <Compass className="w-3.5 h-3.5 text-teal-600" />
              <span>Experience Strategy</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {concept.experienceStrategy}
            </p>
          </div>
        </div>

        {/* Reasoning */}
        {concept.reasoning && (
          <div className="mt-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Evidence-Grounded Rationale
            </span>
            <p className="text-xs text-slate-700 leading-relaxed">
              {concept.reasoning}
            </p>
          </div>
        )}

        {/* Supporting Evidence Links */}
        {concept.supportingEvidenceIds && concept.supportingEvidenceIds.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-mono">Supporting Evidence:</span>
            {concept.supportingEvidenceIds.map((evId, idx) => (
              <span key={idx} className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                {evId}
              </span>
            ))}
          </div>
        )}

        {/* Evidence Gaps & Assumptions */}
        {((concept.evidenceGaps && concept.evidenceGaps.length > 0) ||
          (concept.assumptions && concept.assumptions.length > 0)) && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
            {concept.evidenceGaps && concept.evidenceGaps.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-amber-700 block">
                  Identified Evidence Gaps:
                </span>
                <ul className="text-xs text-slate-600 pl-4 list-disc mt-0.5 space-y-0.5">
                  {concept.evidenceGaps.map((gap, idx) => (
                    <li key={idx}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recommended Validation Experiment */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
            <FlaskConical className="w-4 h-4 text-amber-600" />
            <span>Prescribed Validation Experiment:</span>
          </div>
          <p className="text-xs text-amber-950 leading-relaxed">
            {concept.validationExperiment}
          </p>
        </div>
      </div>
    </div>
  );
};

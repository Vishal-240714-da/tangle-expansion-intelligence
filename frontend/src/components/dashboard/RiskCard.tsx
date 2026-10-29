import React from 'react';
import { Risk } from '../../types';
import { SeverityBadge, RiskStatusBadge } from '../common/Badge';
import { ArrowRight, HelpCircle } from 'lucide-react';

interface RiskCardProps {
  risk: Risk;
}

export const RiskCard: React.FC<RiskCardProps> = ({ risk }) => {
  return (
    <div className="card hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        {/* Header with Title and Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-mono font-bold">
              !
            </span>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              {risk.title}
            </h4>
          </div>

          <div className="flex items-center gap-1.5">
            <SeverityBadge severity={risk.severity} />
            <RiskStatusBadge status={risk.status} />
          </div>
        </div>

        {/* Category tag */}
        {risk.category && (
          <div className="mt-2.5">
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {risk.category}
            </span>
          </div>
        )}

        {/* Why it matters */}
        <div className="mt-3">
          <p className="text-xs text-slate-700 leading-relaxed">
            {risk.whyItMatters}
          </p>
        </div>

        {/* Linked Supporting Evidence */}
        {risk.supportingEvidence && risk.supportingEvidence.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-mono">Linked Evidence:</span>
            {risk.supportingEvidence.map((evId, idx) => (
              <span key={idx} className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                {evId}
              </span>
            ))}
          </div>
        )}

        {/* Missing Information checklist */}
        {risk.missingInformation && risk.missingInformation.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 mb-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Critical Information Gaps:</span>
            </div>
            <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc marker:text-amber-400">
              {risk.missingInformation.map((info, idx) => (
                <li key={idx} className="leading-snug">
                  {info}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommended Action Box */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="p-3 bg-brand-50/70 border border-brand-100 rounded-lg">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-900 mb-1">
            <ArrowRight className="w-3.5 h-3.5 text-brand-600" />
            <span>Recommended Mitigation:</span>
          </div>
          <p className="text-xs text-brand-950 font-normal leading-relaxed">
            {risk.recommendedAction}
          </p>
        </div>
      </div>
    </div>
  );
};

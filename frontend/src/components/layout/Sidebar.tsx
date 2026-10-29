import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  ShieldAlert,
  Coffee,
  Sparkles,
  Layers,
  MapPin,
  Compass,
  Calculator,
} from 'lucide-react';

interface SidebarProps {
  currentSection?: string;
  onSelectSection?: (sectionId: string) => void;
  analysisTitle?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  analysisTitle,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isAnalysisPage = location.pathname.startsWith('/analysis');
  const isNewAnalysisPage = location.pathname === '/';

  const analysisJumpSections = [
    { id: 'overview', label: 'Executive Summary', icon: LayoutDashboard },
    { id: 'findings', label: 'Key Findings', icon: Sparkles },
    { id: 'concepts', label: 'Concept Hypotheses', icon: Coffee },
    { id: 'risks', label: 'Risk Assessment', icon: ShieldAlert },
    { id: 'evidence', label: 'Evidence Explorer', icon: Layers },
    { id: 'financials', label: 'Financial Assumptions', icon: Calculator },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 text-slate-300 flex flex-col justify-between border-r border-slate-800/80 transition-transform duration-200 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-500/20">
                T
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-wider text-white uppercase font-sans">
                    TANGLE
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 text-[9px] font-mono font-medium">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                  Expansion Intelligence
                </p>
              </div>
            </div>

            <div className="mt-3.5 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate">Decision-Support Engine Active</span>
            </div>
          </div>

          {/* Core Routes Nav */}
          <div className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Navigation
            </div>

            <button
              onClick={() => {
                navigate('/');
                onCloseMobile?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isNewAnalysisPage
                  ? 'bg-brand-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <PlusCircle className={`w-4 h-4 ${isNewAnalysisPage ? 'text-white' : 'text-slate-400'}`} />
              <span>New Analysis</span>
            </button>

            {isAnalysisPage && (
              <div
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium bg-slate-900/90 text-white border border-slate-800"
              >
                <Compass className="w-4 h-4 text-brand-400" />
                <span className="truncate">{analysisTitle || 'Analysis Dashboard'}</span>
              </div>
            )}
          </div>

          {/* In-Page Jump Links (When viewing an Analysis) */}
          {isAnalysisPage && (
            <div className="p-3 border-t border-slate-800/80 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Dashboard Sections</span>
                <span className="text-[9px] text-brand-400">JUMP</span>
              </div>

              {analysisJumpSections.map((item) => {
                const Icon = item.icon;
                const isSelected = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectSection?.(item.id);
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                      isSelected
                        ? 'bg-brand-500/15 text-brand-300 font-medium border border-brand-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Operational Principles Card */}
          <div className="mx-3 mt-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
              <span>Benchmark Market</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Strict geographic validation ensures signals are never falsely relabeled as local demand.
            </p>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>TANGLE Core 1.0</span>
            <span className="font-mono">v1.0.0</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-600">
            Transparent Decision Support
          </p>
        </div>
      </aside>
    </>
  );
};

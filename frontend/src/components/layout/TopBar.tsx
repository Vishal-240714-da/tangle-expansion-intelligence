import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, PlusCircle, Printer, Download, ChevronRight, Activity } from 'lucide-react';
import { DataSource, GeographicMatchStatus } from '../../types';
import { GeographicBadge, DataSourceBadge } from '../common/Badge';

interface TopBarProps {
  onToggleMobileSidebar: () => void;
  title?: string;
  targetCity?: string;
  source?: DataSource;
  geographicMatchStatus?: GeographicMatchStatus;
  generatedAt?: string;
  onPrint?: () => void;
  onExport?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleMobileSidebar,
  title,
  targetCity,
  source,
  geographicMatchStatus,
  onPrint,
  onExport,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAnalysisPage = location.pathname.startsWith('/analysis');

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile trigger & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span
              onClick={() => navigate('/')}
              className="hover:text-slate-900 cursor-pointer font-medium transition-colors"
            >
              Expansion Models
            </span>
            {targetCity && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-900 truncate">
                  {targetCity}
                </span>
              </>
            )}
            {title && !targetCity && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-900">
                  {title}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Center/Right: Badges & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {source && (
            <div className="hidden md:block">
              <DataSourceBadge source={source} />
            </div>
          )}

          {geographicMatchStatus && (
            <div className="hidden lg:block">
              <GeographicBadge status={geographicMatchStatus} />
            </div>
          )}

          {isAnalysisPage && onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="btn-secondary py-1.5 px-3 text-xs hidden sm:inline-flex"
              title="Print Expansion Summary"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>
          )}

          {isAnalysisPage && onExport && (
            <button
              type="button"
              onClick={onExport}
              className="btn-secondary py-1.5 px-3 text-xs hidden sm:inline-flex"
              title="Export Raw Intelligence JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>
          )}

          {isAnalysisPage ? (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-primary py-1.5 px-3 text-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Analysis</span>
              <span className="sm:hidden">New</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
              <Activity className="w-3 h-3 text-emerald-500" />
              <span className="hidden sm:inline">Ready to Analyze</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

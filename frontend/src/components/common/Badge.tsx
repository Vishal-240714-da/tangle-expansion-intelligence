import React from 'react';
import { GeographicMatchStatus, RiskSeverity, RiskStatus, DataSource } from '../../types';
import { ShieldAlert, CheckCircle2, AlertTriangle, Globe, MapPin, Sparkles, Database } from 'lucide-react';

interface GeographicBadgeProps {
  status: GeographicMatchStatus;
  className?: string;
  showIcon?: boolean;
}

export const GeographicBadge: React.FC<GeographicBadgeProps> = ({ status, className = '', showIcon = true }) => {
  const configs: Record<GeographicMatchStatus, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
    'verified-city': {
      label: 'Verified City Match',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      text: 'text-emerald-700',
      border: 'border-emerald-200/80',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
    },
    'partial-match': {
      label: 'Partial Geographic Match',
      bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
      text: 'text-amber-700',
      border: 'border-amber-200/80',
      icon: <AlertTriangle className="w-3 h-3 text-amber-600" />,
    },
    'global': {
      label: 'Global Signal (Non-Local)',
      bg: 'bg-sky-50 text-sky-700 border-sky-200/80',
      text: 'text-sky-700',
      border: 'border-sky-200/80',
      icon: <Globe className="w-3 h-3 text-sky-600" />,
    },
    'no-match': {
      label: 'Geographic Mismatch',
      bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
      text: 'text-rose-700',
      border: 'border-rose-200/80',
      icon: <ShieldAlert className="w-3 h-3 text-rose-600" />,
    },
    'unknown-geography': {
      label: 'Unknown Geography',
      bg: 'bg-slate-50 text-slate-600 border-slate-200/80',
      text: 'text-slate-600',
      border: 'border-slate-200/80',
      icon: <MapPin className="w-3 h-3 text-slate-500" />,
    },
  };

  const config = configs[status] || configs['unknown-geography'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${config.bg} ${className}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};

interface SeverityBadgeProps {
  severity: RiskSeverity;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className = '' }) => {
  const configs: Record<RiskSeverity, { label: string; badgeClass: string; dot: string }> = {
    critical: {
      label: 'Critical Risk',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
      dot: 'bg-rose-500',
    },
    high: {
      label: 'High Severity',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200/80',
      dot: 'bg-orange-500',
    },
    medium: {
      label: 'Medium Severity',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dot: 'bg-amber-500',
    },
    low: {
      label: 'Low Severity',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      dot: 'bg-emerald-500',
    },
  };

  const config = configs[severity] || configs.medium;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${config.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};

interface RiskStatusBadgeProps {
  status: RiskStatus;
  className?: string;
}

export const RiskStatusBadge: React.FC<RiskStatusBadgeProps> = ({ status, className = '' }) => {
  const configs: Record<RiskStatus, { label: string; badgeClass: string }> = {
    'requires-validation': {
      label: 'Requires Field Validation',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    'unknown': {
      label: 'Uncertain / Missing Info',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    'known': {
      label: 'Known Baseline Factor',
      badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    },
  };

  const config = configs[status] || configs.unknown;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${config.badgeClass} ${className}`}
    >
      {config.label}
    </span>
  );
};

interface DataSourceBadgeProps {
  source: DataSource;
  className?: string;
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ source, className = '' }) => {
  const configs: Record<string, { label: string; badgeClass: string; icon: React.ReactNode }> = {
    'live-qloo': {
      label: 'Live Qloo Telemetry',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: <Database className="w-3 h-3 text-emerald-600" />,
    },
    'cached-qloo': {
      label: 'Cached Qloo Telemetry',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      icon: <Database className="w-3 h-3 text-sky-600" />,
    },
    'demo-fixture': {
      label: 'Demo Fixture Mode',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: <Sparkles className="w-3 h-3 text-purple-600" />,
    },
  };

  const config = configs[source] || {
    label: source,
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: <Sparkles className="w-3 h-3 text-slate-500" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${config.badgeClass} ${className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

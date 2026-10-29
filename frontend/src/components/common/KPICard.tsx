import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  accentColor?: 'brand' | 'emerald' | 'amber' | 'rose' | 'slate';
  className?: string;
  footer?: React.ReactNode;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  accentColor = 'brand',
  className = '',
  footer,
}) => {
  const accentStyles = {
    brand: 'bg-brand-50 text-brand-600 border-brand-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  }[accentColor];

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 shadow-subtle p-5 flex flex-col justify-between hover:border-slate-300 transition-all ${className}`}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          {icon && (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${accentStyles}`}>
              {icon}
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 font-mono">
            {value}
          </span>
          {badge}
        </div>

        {subtitle && (
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed font-normal">
            {subtitle}
          </p>
        )}
      </div>

      {footer && <div className="mt-4 pt-3 border-t border-slate-100">{footer}</div>}
    </div>
  );
};

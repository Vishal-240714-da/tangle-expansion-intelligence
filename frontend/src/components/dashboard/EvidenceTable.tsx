import React, { useState, useMemo } from 'react';
import { Evidence } from '../../types';
import { GeographicBadge } from '../common/Badge';
import { Search, CheckCircle2 } from 'lucide-react';

interface EvidenceTableProps {
  evidence: Evidence[];
}

export const EvidenceTable: React.FC<EvidenceTableProps> = ({ evidence }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [geoFilter, setGeoFilter] = useState<string>('all');

  const categories = useMemo(() => {
    const set = new Set<string>();
    evidence.forEach((e) => {
      if (e.entityCategory) set.add(e.entityCategory);
    });
    return Array.from(set);
  }, [evidence]);

  const filteredEvidence = useMemo(() => {
    return evidence.filter((item) => {
      const matchesSearch =
        item.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.entityCategory.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = categoryFilter === 'all' || item.entityCategory === categoryFilter;
      const matchesGeo = geoFilter === 'all' || item.geographicMatchStatus === geoFilter;

      return matchesSearch && matchesCat && matchesGeo;
    });
  }, [evidence, searchTerm, categoryFilter, geoFilter]);

  return (
    <div className="card">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              Evidence Detail & Provenance
            </h4>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 font-semibold">
              {filteredEvidence.length} / {evidence.length} items
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Source, geographic status, rule-based category fit, and Qloo affinity or popularity when available.
          </p>
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 focus:bg-white w-40 sm:w-48"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Geo Dropdown */}
          <select
            value={geoFilter}
            onChange={(e) => setGeoFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Geographies</option>
            <option value="verified-city">Verified City</option>
            <option value="partial-match">Partial Match</option>
            <option value="global">Global Only</option>
            <option value="unknown-geography">Unknown Geography</option>
            <option value="no-match">No Match</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-y border-slate-200/80">
            <tr>
              <th className="py-2.5 px-3">Entity Name</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Category Fit</th>
              <th className="py-2.5 px-3">Geographic Match</th>
              <th className="py-2.5 px-3">Source Engine</th>
              <th className="py-2.5 px-3">Affinity Score</th>
              <th className="py-2.5 px-3">Popularity score</th>
              <th className="py-2.5 px-3">Limitations / Provenance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEvidence.length > 0 ? (
              filteredEvidence.map((item) => {
                const affinityVal = typeof item.affinityScore === 'number' && Number.isFinite(item.affinityScore)
                  ? item.affinityScore.toFixed(3)
                  : null;
                const popularityVal = typeof item.popularityScore === 'number' && Number.isFinite(item.popularityScore)
                  ? item.popularityScore.toFixed(3)
                  : null;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900 block truncate max-w-xs">
                        {item.entityName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.id}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                        {item.entityCategory}
                      </span>
                    </td>

                    <td className="py-3 px-3" title={item.categoryRelevance?.explanation || 'Category relevance was not assessed for this saved result.'}>
                      <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium text-slate-700">
                        {item.categoryRelevance?.status || 'unassessed'}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <GeographicBadge status={item.geographicMatchStatus} />
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] text-slate-600">
                        {item.source}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {affinityVal !== null ? (
                        <span className="font-mono font-semibold text-slate-900">{affinityVal}</span>
                      ) : (
                        <span className="text-slate-400 italic" title="This query did not return affinity_score.">Unavailable</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {popularityVal || <span className="text-slate-400 italic">Unavailable</span>}
                    </td>

                    <td className="py-3 px-3 max-w-xs">
                      {item.limitations && item.limitations.length > 0 ? (
                        <div className="text-[11px] text-slate-500 leading-snug">
                          <span className="line-clamp-2">{item.limitations[0]}</span>
                          {item.geographicMetadata && (
                            <span className="block text-[10px] text-slate-400 mt-1">
                              {[item.geographicMetadata.city, item.geographicMetadata.locality, item.geographicMetadata.metro, item.geographicMetadata.region, item.geographicMetadata.district].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Fully verified
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No evidence signals match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>* “Verified city” requires an exact city metadata match; category fit is a lexical screen. Neither establishes demand.</span>
        <span className="font-mono text-[10px]">VERIFIED ROW DATA</span>
      </div>
    </div>
  );
};

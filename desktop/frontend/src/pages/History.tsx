import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Trash2, ArrowRight, AlertCircle, FileImage } from 'lucide-react';
import {
  fetchInspections,
  deleteInspection,
  InspectionListItem,
  AnalyzeResult,
  resolveImageUrl,
} from '../services/api';

interface HistoryProps {
  onSelectResult: (result: AnalyzeResult) => void;
  onNavigateUpload: () => void;
}

export const History: React.FC<HistoryProps> = ({
  onSelectResult,
  onNavigateUpload,
}) => {
  const [inspections, setInspections] = useState<InspectionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'crack' | 'clear'>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInspections(0, 100);
      setInspections(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load inspection history from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Permanently delete inspection #${id}?`)) return;

    try {
      setDeletingId(id);
      await deleteInspection(id);
      setInspections((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(`Error deleting record: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (item: InspectionListItem) => {
    const crackProb = item.is_crack ? item.confidence : Math.max(0, 1 - item.confidence);
    const clearProb = item.is_crack ? Math.max(0, 1 - item.confidence) : item.confidence;

    const result: AnalyzeResult = {
      id: item.uuid || String(item.id),
      filename: item.filename,
      is_crack: item.is_crack,
      predicted_class: item.predicted_class,
      confidence: item.confidence,
      probabilities: {
        positive_crack: Number(crackProb.toFixed(4)),
        negative_clear: Number(clearProb.toFixed(4)),
      },
      image_url: item.image_url,
      created_at: item.created_at,
    };
    onSelectResult(result);
  };

  const filtered = inspections.filter((item) => {
    const matchesQuery = item.filename.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterType === 'crack') return matchesQuery && item.is_crack;
    if (filterType === 'clear') return matchesQuery && !item.is_crack;
    return matchesQuery;
  });

  const totalCount = inspections.length;
  const crackCount = inspections.filter((i) => i.is_crack).length;
  const clearCount = totalCount - crackCount;

  return (
    <div className="space-y-6 animate-fade-rise">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight">
            Inspection history
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Database records of all analyzed structural surfaces and crack events
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 bg-surface hover:bg-surface-hover border border-white/[0.08] hover:border-white/[0.16] text-text-primary text-xs font-medium rounded-lg transition flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onNavigateUpload}
            className="px-3.5 py-2 bg-gradient-to-r from-accent to-[#B64A34] text-white text-xs font-medium rounded-lg hover:shadow-[0_0_15px_rgba(200,85,61,0.35)] transition shadow-sm"
          >
            New inspection
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-white/[0.08] focus:border-accent text-text-primary placeholder:text-text-tertiary rounded-lg pl-9 pr-3 py-2 text-xs transition focus:outline-none"
          />
        </div>

        <div className="flex bg-surface p-1 rounded-lg border border-white/[0.08]">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition ${
              filterType === 'all'
                ? 'bg-surface-elevated text-text-primary border border-white/[0.08] shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilterType('crack')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition ${
              filterType === 'crack'
                ? 'bg-surface-elevated text-text-primary border border-white/[0.08] shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Cracks ({crackCount})
          </button>
          <button
            onClick={() => setFilterType('clear')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition ${
              filterType === 'clear'
                ? 'bg-surface-elevated text-text-primary border border-white/[0.08] shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Clear ({clearCount})
          </button>
        </div>
      </div>

      {/* Table of Records or Skeleton / Empty */}
      {loading ? (
        <div className="card-surface p-6 space-y-3">
          <div className="h-6 w-48 rounded skeleton" />
          <div className="h-10 w-full rounded skeleton" />
          <div className="h-10 w-full rounded skeleton" />
          <div className="h-10 w-full rounded skeleton" />
        </div>
      ) : error ? (
        <div className="p-4 bg-accent/10 border border-accent/25 rounded-xl text-xs text-text-primary flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 text-accent" />
          <span>{error}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-surface p-12 text-center text-xs text-text-secondary space-y-3">
          <p>No inspection records match your criteria.</p>
          {!searchQuery && (
            <button
              onClick={onNavigateUpload}
              className="text-xs text-accent hover:underline font-medium"
            >
              Analyze a concrete photograph &rarr;
            </button>
          )}
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-elevated/40 border-b border-white/[0.06] text-text-tertiary font-medium">
              <tr>
                <th className="py-3 px-4 w-16">ID</th>
                <th className="py-3 px-4">Surface / File</th>
                <th className="py-3 px-4">Verdict</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-text-secondary">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleView(item)}
                  className="hover:bg-surface-hover/80 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 font-mono text-text-tertiary text-[11px]">
                    #{item.id}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-md bg-surface-elevated border border-white/[0.08] overflow-hidden flex items-center justify-center flex-shrink-0">
                        {item.image_url ? (
                          <img
                            src={resolveImageUrl(item.image_url)}
                            alt="Thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileImage className="w-4 h-4 text-text-tertiary" />
                        )}
                      </div>
                      <span className="font-mono text-xs text-text-primary font-medium truncate max-w-xs">
                        {item.filename}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {item.is_crack ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent/15 text-[#E07A65] border border-accent/25">
                        Crack detected
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald/15 text-emerald-text border border-emerald/25">
                        Clear surface
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-text-primary">
                    {(item.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 font-mono text-text-tertiary text-[11px]">
                    {new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(item);
                      }}
                      className="text-accent hover:text-accent-hover text-xs font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={deletingId === item.id}
                      className="text-text-tertiary hover:text-accent text-xs ml-3 transition"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  History as HistoryIcon,
  Search,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Layers,
  RefreshCw,
  AlertCircle,
  Database,
  CheckCircle,
} from 'lucide-react';
import {
  fetchInspections,
  deleteInspection,
  InspectionListItem,
  AnalyzeResult,
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
      setError(err.message || 'Failed to load inspection history from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete inspection #${id}?`)) {
      return;
    }

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

  // Filtered items
  const filtered = inspections.filter((item) => {
    const matchesQuery = item.filename.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterType === 'crack') return matchesQuery && item.is_crack;
    if (filterType === 'clear') return matchesQuery && !item.is_crack;
    return matchesQuery;
  });

  const totalCount = inspections.length;
  const crackCount = inspections.filter((i) => i.is_crack).length;
  const clearCount = totalCount - crackCount;
  const avgConfidence =
    totalCount > 0
      ? (inspections.reduce((acc, curr) => acc + curr.confidence, 0) / totalCount) * 100
      : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <HistoryIcon className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-slate-100">Inspection History</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Persisted scans in PostgreSQL / SQLite with predictions, metrics, and image artifacts
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onNavigateUpload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-blue-600/20"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>New Scan</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
          <p className="text-[11px] text-slate-400 font-medium">Total Saved Scans</p>
          <p className="text-xl font-bold font-mono text-slate-100 mt-1">{totalCount}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
          <p className="text-[11px] text-red-400 font-medium">Cracks Detected</p>
          <p className="text-xl font-bold font-mono text-red-400 mt-1">{crackCount}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
          <p className="text-[11px] text-emerald-400 font-medium">Clear Surfaces</p>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{clearCount}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">
          <p className="text-[11px] text-blue-400 font-medium">Avg Confidence</p>
          <p className="text-xl font-bold font-mono text-blue-400 mt-1">{avgConfidence.toFixed(1)}%</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl pl-8 pr-3 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-slate-800'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilterType('crack')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
              filterType === 'crack'
                ? 'bg-red-600 text-white'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-slate-800'
            }`}
          >
            Cracks ({crackCount})
          </button>
          <button
            onClick={() => setFilterType('clear')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
              filterType === 'clear'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-slate-800'
            }`}
          >
            Clear ({clearCount})
          </button>
        </div>
      </div>

      {/* Main Inspection List */}
      {loading ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading inspection records from database...</p>
        </div>
      ) : error ? (
        <div className="bg-red-950/30 border border-red-800/60 rounded-2xl p-6 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
          <h3 className="text-sm font-semibold text-red-300">Database Connection Notice</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
          <button
            onClick={loadData}
            className="mt-2 px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 rounded-lg text-xs text-red-200 font-medium transition"
          >
            Retry Connection
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Database className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No inspections found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'No inspections matched your search filter.'
              : 'You have not run any concrete surface scans yet. Upload an image to analyze.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onNavigateUpload}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
            >
              Analyze Concrete Image
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => handleView(item)}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex items-center justify-between gap-4 cursor-pointer transition group"
            >
              {/* Left: Thumbnail & Details */}
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="w-14 h-14 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  <img
                    src={item.image_url}
                    alt={item.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-semibold text-slate-200 truncate max-w-xs">
                      {item.filename}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">#{item.id}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Right: Prediction status, confidence bar, actions */}
              <div className="flex items-center space-x-4 flex-shrink-0">
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-1.5">
                    {item.is_crack ? (
                      <span className="flex items-center space-x-1 text-xs font-semibold text-red-400 bg-red-950/70 border border-red-800/60 px-2 py-0.5 rounded-md">
                        <ShieldAlert className="w-3 h-3" />
                        <span>CRACK</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                        <ShieldCheck className="w-3 h-3" />
                        <span>CLEAR</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">
                    {(item.confidence * 100).toFixed(1)}% conf
                  </p>
                </div>

                <div className="flex items-center space-x-1 border-l border-slate-800 pl-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(item);
                    }}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 transition"
                    title="View Inspection Analysis"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    disabled={deletingId === item.id}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-800/80 transition"
                    title="Delete Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

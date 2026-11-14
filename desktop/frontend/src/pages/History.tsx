import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Trash2, ArrowRight, AlertCircle } from 'lucide-react';
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
    <div className="max-w-5xl mx-auto space-y-5 text-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Inspection history</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Database records of all analyzed structural surfaces
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs rounded transition flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onNavigateUpload}
            className="px-3 py-1.5 bg-[#c92a2a] hover:bg-[#b02525] text-white text-xs font-medium rounded transition"
          >
            New inspection
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
          />
        </div>

        <div className="flex items-center space-x-1 border border-zinc-200 rounded bg-white overflow-hidden">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 font-medium transition ${
              filterType === 'all'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilterType('crack')}
            className={`px-3 py-1 font-medium border-l border-zinc-200 transition ${
              filterType === 'crack'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Cracks ({crackCount})
          </button>
          <button
            onClick={() => setFilterType('clear')}
            className={`px-3 py-1 font-medium border-l border-zinc-200 transition ${
              filterType === 'clear'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Clear ({clearCount})
          </button>
        </div>
      </div>

      {/* Table of Records */}
      {loading ? (
        <div className="p-12 border border-zinc-200 rounded bg-white text-center text-xs text-zinc-500">
          Loading history from database...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-[#c92a2a]" />
          <span>{error}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 border border-zinc-200 rounded bg-white text-center text-xs text-zinc-500 space-y-2">
          <p>No inspection records match your criteria.</p>
          {!searchQuery && (
            <button
              onClick={onNavigateUpload}
              className="text-xs text-[#c92a2a] hover:underline font-medium"
            >
              Analyze a concrete photograph &rarr;
            </button>
          )}
        </div>
      ) : (
        <div className="border border-zinc-200 rounded overflow-hidden bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
              <tr>
                <th className="py-2 px-3 w-16">ID</th>
                <th className="py-2 px-3">File</th>
                <th className="py-2 px-3">Verdict</th>
                <th className="py-2 px-3">Confidence</th>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleView(item)}
                  className="hover:bg-zinc-50 cursor-pointer transition"
                >
                  <td className="py-2.5 px-3 font-mono text-zinc-400 text-[11px]">
                    #{item.id}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-zinc-900 font-medium truncate max-w-xs">
                    {item.filename}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={
                        item.is_crack
                          ? 'text-[#c92a2a] font-medium'
                          : 'text-zinc-600'
                      }
                    >
                      {item.predicted_class}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {(item.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 font-mono text-zinc-500 text-[11px]">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(item);
                      }}
                      className="text-[#c92a2a] hover:underline text-xs"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={deletingId === item.id}
                      className="text-zinc-400 hover:text-red-700 text-xs ml-2"
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

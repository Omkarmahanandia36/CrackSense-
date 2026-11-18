import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Trash2, FileImage } from 'lucide-react';
import {
  fetchInspections,
  deleteInspection,
  InspectionListItem,
  AnalyzeResult,
  resolveImageUrl,
} from '../services/api';
import {
  GlassPanel,
  Button,
  Input,
  SegmentedControl,
  Skeleton,
  EmptyState,
} from '../components/ui';

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
            Inspection history
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
            Database records of all analyzed structural surfaces and defect classifications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={loadData}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onNavigateUpload}
          >
            New inspection
          </Button>
        </div>
      </div>

      {/* Filter & Search Toolbar in a single unified bar */}
      <GlassPanel variant="base" className="p-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input
              leftIcon={Search}
              placeholder="Search by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <SegmentedControl
            size="sm"
            value={filterType}
            onChange={(val) => setFilterType(val as any)}
            options={[
              { id: 'all', label: `All (${totalCount})` },
              { id: 'crack', label: `Cracks (${crackCount})` },
              { id: 'clear', label: `Clear (${clearCount})` },
            ]}
          />
        </div>
      </GlassPanel>

      {/* Table of Records or Skeleton / Empty */}
      {loading ? (
        <GlassPanel variant="base" className="p-6 space-y-4">
          <Skeleton height={20} width="40%" />
          <Skeleton height={42} width="100%" />
          <Skeleton height={42} width="100%" />
          <Skeleton height={42} width="100%" />
        </GlassPanel>
      ) : error ? (
        <div
          className="p-4 rounded-xl text-xs flex items-center gap-2.5"
          style={{
            background: 'var(--crack-tint)',
            border: '1px solid rgba(255, 69, 58, 0.3)',
            color: 'var(--text-1)',
          }}
        >
          <span>{error}</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No inspection records found"
          description={
            searchQuery
              ? `No records match "${searchQuery}". Try adjusting your search term or filter.`
              : 'There are no inspection records saved in the database yet.'
          }
          actionLabel={searchQuery ? 'Clear search' : 'Analyze a concrete photograph'}
          onAction={searchQuery ? () => setSearchQuery('') : onNavigateUpload}
        />
      ) : (
        /* Table on a sunken-glass surface */
        <div
          className="w-full overflow-x-auto"
          style={{
            background: 'var(--glass-sunken-bg)',
            border: '1px solid var(--glass-sunken-border)',
            borderRadius: 'var(--r-panel)',
          }}
        >
          <table className="w-full text-left text-xs">
            <thead
              className="border-b font-medium"
              style={{
                borderColor: 'var(--glass-sunken-border)',
                color: 'var(--text-3)',
              }}
            >
              <tr>
                <th className="py-3 px-4 w-16">ID</th>
                <th className="py-3 px-4">Surface / File</th>
                <th className="py-3 px-4">Verdict</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{
                borderColor: 'var(--glass-sunken-border)',
                color: 'var(--text-2)',
              }}
            >
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleView(item)}
                  className="hover:bg-[--hover-bg] cursor-pointer transition-colors duration-150 group"
                >
                  <td className="py-3 px-4 font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
                    #{item.id}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'var(--glass-sunken-bg)',
                          border: '1px solid var(--glass-sunken-border)',
                        }}
                      >
                        {item.image_url ? (
                          <img
                            src={resolveImageUrl(item.image_url)}
                            alt="Thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileImage className="w-4 h-4" style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
                        )}
                      </div>
                      <span className="font-mono text-xs font-medium truncate max-w-xs" style={{ color: 'var(--text-1)' }}>
                        {item.filename}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {item.is_crack ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{
                          background: 'var(--crack-tint)',
                          color: 'var(--crack)',
                          border: '1px solid rgba(255, 69, 58, 0.25)',
                        }}
                      >
                        Crack detected
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{
                          background: 'var(--success-tint)',
                          color: 'var(--success)',
                          border: '1px solid rgba(48, 209, 88, 0.25)',
                        }}
                      >
                        Clear surface
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs" style={{ color: 'var(--text-1)' }}>
                    {(item.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
                    {new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(item);
                      }}
                      className="text-xs font-medium transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={deletingId === item.id}
                      className="p-1 rounded-md transition-colors hover:bg-[--hover-bg] ml-2"
                      style={{ color: 'var(--text-3)' }}
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline" strokeWidth={1.5} />
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

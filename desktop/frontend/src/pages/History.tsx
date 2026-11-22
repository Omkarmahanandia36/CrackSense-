import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Trash2, FileImage, Cloud, UploadCloud, CheckCircle2, Clock } from 'lucide-react';
import {
  fetchInspections,
  deleteInspection,
  InspectionListItem,
  AnalyzeResult,
  resolveImageUrl,
} from '../services/api';
import {
  isSupabaseConfigured,
  fetchSupabaseInspections,
  getLocalInspections,
  syncPendingInspections,
  getSignedImageUrl,
  supabase,
} from '../services/supabase';
import { deleteCloudinaryInspectionAssets } from '../services/cloudinary';
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

const HistoryThumbnail: React.FC<{ url?: string; filename: string }> = ({ url, filename }) => {
  const [src, setSrc] = useState(() => resolveImageUrl(url));

  useEffect(() => {
    let active = true;
    if (url && (url.startsWith('cracksense/') || !url.startsWith('http'))) {
      getSignedImageUrl(url).then((signed) => {
        if (active && signed) setSrc(signed);
      });
    } else {
      setSrc(resolveImageUrl(url));
    }
    return () => {
      active = false;
    };
  }, [url]);

  if (!url) {
    return <FileImage className="w-4 h-4" style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />;
  }

  return <img src={src} alt={filename} className="w-full h-full object-cover" />;
};

export const History: React.FC<HistoryProps> = ({
  onSelectResult,
  onNavigateUpload,
}) => {
  const [inspections, setInspections] = useState<InspectionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'crack' | 'clear'>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const localItems = getLocalInspections();
      const pending = localItems.filter(
        (x) => x.syncStatus === 'pending' || x.syncStatus === 'failed'
      );
      setPendingCount(pending.length);

      let items: InspectionListItem[] = [];

      // 1. Fetch from Supabase Cloud if configured
      if (isSupabaseConfigured()) {
        try {
          const supaList = await fetchSupabaseInspections(100);
          if (supaList && supaList.length > 0) {
            items = supaList.map((s, idx) => ({
              id: idx + 1,
              uuid: s.id,
              filename: s.filename,
              is_crack: s.verdict === 'crack_detected',
              predicted_class: s.verdict === 'crack_detected' ? 'crack' : 'clear',
              confidence: s.confidence,
              image_url: s.image_public_id || s.image_url || '',
              created_at: s.created_at,
              sync_status: s.sync_status || 'synced',
              detections: s.detections,
              mask_png_base64: s.mask_png_base64,
              boxes: s.detections?.map((d: any) => ({
                x: d.bbox ? d.bbox[0] : 0,
                y: d.bbox ? d.bbox[1] : 0,
                width: d.bbox ? d.bbox[2] : 0,
                height: d.bbox ? d.bbox[3] : 0,
                confidence: d.confidence,
                label: 'crack',
              })),
            }));
          }
        } catch (supaErr) {
          console.warn('Supabase inspections fetch error:', supaErr);
        }
      }

      // 2. If no cloud records or offline, fallback to backend /inspections
      if (items.length === 0) {
        try {
          items = await fetchInspections(0, 100);
        } catch {
          // offline or empty backend
        }
      }

      // 3. Prepend local pending records if not already in list
      const existingUuids = new Set(items.map((i) => i.uuid));
      for (const loc of localItems) {
        if (!existingUuids.has(loc.clientId) && !existingUuids.has(loc.supabaseId || '')) {
          items.unshift({
            id: items.length + 1,
            uuid: loc.clientId,
            filename: loc.filename,
            is_crack: loc.verdict === 'crack_detected',
            predicted_class: loc.verdict === 'crack_detected' ? 'crack' : 'clear',
            confidence: loc.confidence,
            image_url: loc.imageUrl,
            created_at: loc.createdAt,
            sync_status: loc.syncStatus,
            detections: loc.detections,
            mask_png_base64: loc.maskPngBase64,
            boxes: loc.detections?.map((d: any) => ({
              x: d.bbox ? d.bbox[0] : 0,
              y: d.bbox ? d.bbox[1] : 0,
              width: d.bbox ? d.bbox[2] : 0,
              height: d.bbox ? d.bbox[3] : 0,
              confidence: d.confidence,
              label: 'crack',
            })),
          });
        }
      }

      setInspections(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load inspection history.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPending = async () => {
    setSyncing(true);
    try {
      const result = await syncPendingInspections();
      await loadData();
    } catch (err: any) {
      alert(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetItem = inspections.find((item) => item.id === id);
    if (!window.confirm(`Permanently delete inspection #${id}?`)) return;

    try {
      setDeletingId(id);
      if (isSupabaseConfigured() && targetItem?.uuid) {
        await deleteCloudinaryInspectionAssets(targetItem.uuid);
      }
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
      boxes: item.boxes,
      detections: item.detections,
      mask_png_base64: item.mask_png_base64,
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
          {pendingCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={UploadCloud}
              onClick={handleSyncPending}
              loading={syncing}
            >
              Sync Pending ({pendingCount})
            </Button>
          )}
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
        <>
          {/* Desktop Table View */}
          <div
            className="hidden md:block w-full overflow-x-auto"
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
                  <th className="py-3 px-4">Cloud Sync</th>
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
                          <HistoryThumbnail url={item.image_url} filename={item.filename} />
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
                    <td className="py-3 px-4">
                      {item.sync_status === 'synced' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Synced
                        </span>
                      ) : item.sync_status === 'pending' || item.sync_status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
                          Local
                        </span>
                      )}
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

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-2.5 pb-16">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => handleView(item)}
                className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md flex items-center justify-between gap-3 active:scale-[0.98] transition-all cursor-pointer"
                style={{
                  background: 'var(--glass-sunken-bg)',
                  borderColor: 'var(--glass-sunken-border)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-black/40 border border-white/10 flex items-center justify-center">
                    <HistoryThumbnail url={item.image_url} filename={item.filename} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-medium truncate max-w-[150px]" style={{ color: 'var(--text-1)' }}>
                      {item.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          background: item.is_crack ? 'var(--crack-tint)' : 'var(--success-tint)',
                          color: item.is_crack ? 'var(--crack)' : 'var(--success)',
                          border: `1px solid ${item.is_crack ? 'rgba(255, 69, 58, 0.3)' : 'rgba(48, 209, 88, 0.3)'}`,
                        }}
                      >
                        {item.is_crack ? 'Crack detected' : 'Clear'}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
                        {(item.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    disabled={deletingId === item.id}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 active:scale-95"
                    title="Delete inspection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

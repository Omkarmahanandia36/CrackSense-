import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  UploadCloud,
  Download,
  Save,
  CheckCircle2,
  FileImage,
} from 'lucide-react';
import { AnalyzeResult, resolveImageUrl } from '../services/api';
import { GlassPanel, Button, SegmentedControl, Toast } from '../components/ui';
import {
  saveInspectionLocalFirst,
  getSignedImageUrl,
  supabase,
} from '../services/supabase';

interface ResultViewProps {
  result: AnalyzeResult;
  onNewInspection: () => void;
  onBackToDashboard: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  result,
  onNewInspection,
  onBackToDashboard,
}) => {
  // View mode: default Both
  const [viewMode, setViewMode] = useState<'both' | 'boxes' | 'mask' | 'original'>('both');
  const [hoveredBoxIdx, setHoveredBoxIdx] = useState<number | null>(null);
  const [selectedBoxIdx, setSelectedBoxIdx] = useState<number | null>(null);

  // Zoom and pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Table row refs for scroll into view
  const tableRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  // Natural image dimensions
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({
    width: result.image_width || 640,
    height: result.image_height || 640,
  });

  // Review status and notes
  const [isReviewed, setIsReviewed] = useState<boolean>(() => {
    return localStorage.getItem(`cracksense_reviewed_${result.id}`) === 'true';
  });
  const [reviewedAt, setReviewedAt] = useState<string | null>(() => {
    return localStorage.getItem(`cracksense_reviewed_at_${result.id}`);
  });
  const [notes, setNotes] = useState<string>(() => {
    return localStorage.getItem(`cracksense_notes_${result.id}`) || '';
  });

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Detections & Boxes mapping
  const detections = result.detections || [];
  const boxes = (result.boxes && result.boxes.length > 0)
    ? result.boxes
    : detections.map((d) => ({
        x1: d.bbox[0],
        y1: d.bbox[1],
        x2: d.bbox[0] + d.bbox[2],
        y2: d.bbox[1] + d.bbox[3],
        confidence: d.confidence,
        label: 'Crack Region',
      }));

  // Plain headline text
  const verdictHeadline =
    boxes.length > 0
      ? `${boxes.length} crack region${boxes.length === 1 ? '' : 's'} found`
      : result.is_crack
      ? 'Crack detected'
      : 'No crack found';

  const confidencePct = Math.round(result.confidence * 100);

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(4.0, Math.max(0.5, Number((prev + delta).toFixed(2)))));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
    handleZoom(zoomDelta);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const handleSelectBox = (idx: number) => {
    setSelectedBoxIdx(idx);
    const rowEl = tableRowRefs.current[idx];
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const toggleReviewStatus = () => {
    if (isReviewed) {
      setIsReviewed(false);
      setReviewedAt(null);
      localStorage.removeItem(`cracksense_reviewed_${result.id}`);
      localStorage.removeItem(`cracksense_reviewed_at_${result.id}`);
      setToastMessage('Marked as pending review');
    } else {
      const now = new Date().toLocaleString();
      setIsReviewed(true);
      setReviewedAt(now);
      localStorage.setItem(`cracksense_reviewed_${result.id}`, 'true');
      localStorage.setItem(`cracksense_reviewed_at_${result.id}`, now);
      setToastMessage('Signed off and reviewed');
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    localStorage.setItem(`cracksense_notes_${result.id}`, val);
  };

  // Cloud sync status state
  const [syncStatus, setSyncStatus] = useState<'pending' | 'syncing' | 'synced' | null>(null);

  const handleSave = async () => {
    localStorage.setItem(`cracksense_notes_${result.id}`, notes);
    if (isReviewed) {
      localStorage.setItem(`cracksense_reviewed_${result.id}`, 'true');
    }

    try {
      setSyncStatus('syncing');
      const currentUser = (await supabase.auth.getUser()).data.user;
      await saveInspectionLocalFirst({
        userId: currentUser?.id || 'offline-user',
        filename: result.filename,
        imageUrl: result.image_url,
        annotatedImageUrl: result.annotated_image_url,
        maskPngBase64: result.mask_png_base64,
        verdict: result.is_crack ? 'crack_detected' : 'no_crack',
        confidence: result.confidence,
        boxCount: boxes.length,
        imageWidth: naturalDimensions.width,
        imageHeight: naturalDimensions.height,
        detections: detections,
        metadata: {
          notes,
          reviewed: isReviewed,
          reviewedAt,
          probabilities: result.probabilities,
        },
      });

      setSyncStatus('synced');
      setToastMessage('Inspection saved & synced to cloud');
    } catch (err: any) {
      console.warn('Sync failed during save, persisted locally:', err);
      setSyncStatus('pending');
      setToastMessage('Saved locally (offline pending sync)');
    }
  };

  // Burn overlays into a high-res canvas and download as image
  const handleDownloadAnnotatedImage = async () => {
    if (!imageRef.current) return;
    setIsExporting(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = naturalDimensions.width;
      canvas.height = naturalDimensions.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // 1. Draw base image
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

      // 2. Draw mask layer if available
      if (result.mask_png_base64 && (viewMode === 'mask' || viewMode === 'both')) {
        const maskImg = new Image();
        maskImg.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          maskImg.onload = resolve;
          maskImg.src = `data:image/png;base64,${result.mask_png_base64}`;
        });

        // Create colored mask buffer
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const mctx = maskCanvas.getContext('2d');
        if (mctx) {
          mctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
          mctx.globalCompositeOperation = 'source-in';
          mctx.fillStyle = 'rgba(255, 69, 58, 0.65)';
          mctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.drawImage(maskCanvas, 0, 0);
        }
      }

      // 3. Draw bounding boxes
      if (viewMode === 'boxes' || viewMode === 'both') {
        boxes.forEach((b, idx) => {
          const w = b.x2 - b.x1;
          const h = b.y2 - b.y1;

          ctx.lineWidth = 3;
          ctx.strokeStyle = '#FF453A';
          ctx.strokeRect(b.x1, b.y1, w, h);

          // ID chip
          const text = `#${idx + 1} ${(b.confidence * 100).toFixed(0)}%`;
          ctx.font = 'bold 14px "JetBrains Mono", monospace';
          const textWidth = ctx.measureText(text).width;

          ctx.fillStyle = '#FF453A';
          ctx.fillRect(b.x1, Math.max(0, b.y1 - 22), textWidth + 12, 22);

          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(text, b.x1 + 6, Math.max(16, b.y1 - 6));
        });
      }

      // 4. Download blob
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cracksense_annotated_${result.filename || 'inspection'}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setToastMessage('Annotated image downloaded');
      }, 'image/png');
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  const rawImageUrl = resolveImageUrl(result.image_url);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] space-y-3 animate-fade-rise">
      {/* Hidden SVG Filter to colorize transparent white crack mask pixels into #FF453A at ~60% opacity */}
      <svg className="hidden">
        <defs>
          <filter id="crack-red-filter">
            <feColorMatrix
              type="matrix"
              values="1.0 0   0   0   1.0
                      0   0.27 0   0   0.27
                      0   0   0.23 0   0.23
                      0   0   0   0.62 0"
            />
          </filter>
        </defs>
      </svg>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50">
          <Toast
            type="success"
            title="Saved"
            message={toastMessage}
            onClose={() => setToastMessage(null)}
            durationMs={2500}
          />
        </div>
      )}

      {/* Top Header / Breadcrumb Bar */}
      <GlassPanel variant="base" className="h-12 px-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={onBackToDashboard}
          >
            Dashboard
          </Button>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span className="text-xs font-mono font-medium truncate max-w-sm" style={{ color: 'var(--text-1)' }}>
            {result.filename}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={UploadCloud}
            onClick={onNewInspection}
          >
            Analyze another image
          </Button>
        </div>
      </GlassPanel>

      {/* Main Split Workbench: 65% Image Viewer / 35% Inspector Panel */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* Left Column: Glass Image Viewer (~65% width) */}
        <GlassPanel
          variant="base"
          className="flex-1 flex flex-col min-w-0 overflow-hidden relative"
        >
          {/* Viewer Toolbar */}
          <div
            className="h-12 px-4 flex items-center justify-between border-b flex-shrink-0"
            style={{ borderColor: 'var(--glass-sunken-border)' }}
          >
            {/* Segmented Control: Original | Boxes | Mask | Both (default: Both) */}
            <SegmentedControl
              size="sm"
              value={viewMode}
              onChange={(val) => setViewMode(val as any)}
              options={[
                { id: 'original', label: 'Original' },
                { id: 'boxes', label: `Boxes (${boxes.length})` },
                { id: 'mask', label: 'Mask' },
                { id: 'both', label: 'Both' },
              ]}
            />

            {/* Zoom / Pan Toolbar */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleZoom(-0.25)}
                className="p-1.5 rounded-lg transition-colors hover:bg-[--hover-bg] cursor-pointer"
                style={{ color: 'var(--text-2)' }}
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <span className="font-mono text-[11px] w-12 text-center select-none" style={{ color: 'var(--text-2)' }}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => handleZoom(0.25)}
                className="p-1.5 rounded-lg transition-colors hover:bg-[--hover-bg] cursor-pointer"
                style={{ color: 'var(--text-2)' }}
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={handleResetView}
                className="p-1.5 rounded-lg transition-colors hover:bg-[--hover-bg] ml-1 cursor-pointer"
                style={{ color: 'var(--text-2)' }}
                title="Reset zoom and pan"
              >
                <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Interactive Canvas Viewport (Image stays crisp without blur) */}
          <div
            className="flex-1 overflow-hidden relative flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ background: 'var(--glass-sunken-bg)' }}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.12s ease-out',
              }}
              className="relative inline-block max-w-full max-h-full"
            >
              {/* Sharp Target Image (Original pixel resolution) */}
              <img
                ref={imageRef}
                src={rawImageUrl}
                alt={result.filename}
                onLoad={handleImageLoad}
                className="block max-w-[75vw] max-h-[70vh] object-contain rounded-xl shadow-2xl"
                style={{
                  border: '1px solid var(--glass-sunken-border)',
                }}
                draggable={false}
              />

              {/* Mask Layer: crack pixels in amber/red (#FF453A) at ~60% opacity with soft outline */}
              {(viewMode === 'mask' || viewMode === 'both') && result.mask_png_base64 && (
                <img
                  src={`data:image/png;base64,${result.mask_png_base64}`}
                  alt="Crack Mask"
                  className="absolute inset-0 w-full h-full pointer-events-none rounded-xl"
                  style={{
                    filter: 'url(#crack-red-filter) drop-shadow(0 0 2px rgba(255, 69, 58, 0.7))',
                  }}
                  draggable={false}
                />
              )}

              {/* Box Layer: thin rounded rectangles with label 1, 2, 3 and stroke drawing animation */}
              {(viewMode === 'boxes' || viewMode === 'both') && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${naturalDimensions.width} ${naturalDimensions.height}`}
                  preserveAspectRatio="none"
                >
                  {boxes.map((b, idx) => {
                    const width = b.x2 - b.x1;
                    const height = b.y2 - b.y1;
                    const isHovered = hoveredBoxIdx === idx;
                    const isSelected = selectedBoxIdx === idx;

                    return (
                      <g
                        key={idx}
                        className="pointer-events-auto cursor-pointer"
                        onClick={() => handleSelectBox(idx)}
                        onMouseEnter={() => setHoveredBoxIdx(idx)}
                        onMouseLeave={() => setHoveredBoxIdx(null)}
                      >
                        {/* Bounding box rectangle with stroke animation */}
                        <rect
                          x={b.x1}
                          y={b.y1}
                          width={width}
                          height={height}
                          fill={
                            isHovered || isSelected
                              ? 'rgba(255, 69, 58, 0.20)'
                              : 'none'
                          }
                          stroke={isHovered || isSelected ? '#FF9F0A' : '#FF453A'}
                          strokeWidth={isHovered || isSelected ? 3 : 1.8}
                          rx={4}
                          className="transition-all duration-150"
                          style={{
                            filter: isHovered || isSelected ? 'drop-shadow(0 0 4px #FF9F0A)' : undefined,
                          }}
                        />

                        {/* Box label chip: small "1", "2" (shows confidence on hover) */}
                        <rect
                          x={b.x1}
                          y={Math.max(0, b.y1 - 18)}
                          width={isHovered || isSelected ? 52 : 22}
                          height={18}
                          rx={4}
                          fill={isHovered || isSelected ? '#FF9F0A' : '#FF453A'}
                          className="transition-all duration-150"
                        />
                        <text
                          x={b.x1 + 5}
                          y={Math.max(13, b.y1 - 5)}
                          fill="#FFFFFF"
                          fontSize="10"
                          fontFamily="var(--font-mono)"
                          fontWeight="600"
                        >
                          {isHovered || isSelected
                            ? `#${idx + 1} ${(b.confidence * 100).toFixed(0)}%`
                            : String(idx + 1)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            {/* Resolution indicator chip (bottom-right) */}
            <div
              className="absolute bottom-4 right-4 px-3 py-1 text-[11px] font-mono rounded-lg shadow-sm"
              style={{
                background: 'var(--glass-raised-bg)',
                border: '1px solid var(--glass-raised-border)',
                color: 'var(--text-2)',
              }}
            >
              {naturalDimensions.width} &times; {naturalDimensions.height} px
            </div>
          </div>
        </GlassPanel>

        {/* Right Column: Glass Inspector Panel (~35% width, 380px) */}
        <GlassPanel
          variant="base"
          className="w-96 flex-shrink-0 flex flex-col justify-between overflow-y-auto p-6 space-y-6"
        >
          <div className="space-y-6">
            {/* Section 1: Plain Verdict Headline & Thin Confidence Bar */}
            <div className="space-y-3">
              <span className="text-[11px] font-medium tracking-wider uppercase block" style={{ color: 'var(--text-3)' }}>
                Verdict
              </span>

              <h2
                className="text-xl font-semibold tracking-tight"
                style={{
                  color: result.is_crack || boxes.length > 0 ? 'var(--crack)' : 'var(--success)',
                }}
              >
                {verdictHeadline}
              </h2>

              {/* Thin Confidence Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-3)' }}>Confidence</span>
                  <span className="font-mono font-medium" style={{ color: 'var(--text-1)' }}>
                    {confidencePct}%
                  </span>
                </div>
                <div
                  className="w-full h-1 rounded-full overflow-hidden"
                  style={{ background: 'var(--glass-sunken-bg)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${confidencePct}%`,
                      background: result.is_crack || boxes.length > 0 ? 'var(--crack)' : 'var(--success)',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="border-t" style={{ borderColor: 'var(--glass-sunken-border)' }} />

            {/* Section 2: Metadata */}
            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-medium tracking-wider uppercase block" style={{ color: 'var(--text-3)' }}>
                Scan details
              </span>
              <div className="grid grid-cols-3 gap-1 py-0.5">
                <span style={{ color: 'var(--text-3)' }}>File</span>
                <span className="col-span-2 truncate font-mono" style={{ color: 'var(--text-1)' }}>
                  {result.filename}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 py-0.5">
                <span style={{ color: 'var(--text-3)' }}>Dimensions</span>
                <span className="col-span-2 font-mono" style={{ color: 'var(--text-2)' }}>
                  {naturalDimensions.width} &times; {naturalDimensions.height} px
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 py-0.5">
                <span style={{ color: 'var(--text-3)' }}>Timestamp</span>
                <span className="col-span-2 font-mono" style={{ color: 'var(--text-2)' }}>
                  {new Date(result.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="border-t" style={{ borderColor: 'var(--glass-sunken-border)' }} />

            {/* Section 3: Detections Table with Bidirectional Linking */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium tracking-wider uppercase block" style={{ color: 'var(--text-3)' }}>
                  Detections ({boxes.length})
                </span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
                  x, y, w, h
                </span>
              </div>

              {boxes.length === 0 ? (
                <p className="text-xs py-2" style={{ color: 'var(--text-3)' }}>
                  No crack regions detected.
                </p>
              ) : (
                <div
                  className="rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                  style={{
                    background: 'var(--glass-sunken-bg)',
                    border: '1px solid var(--glass-sunken-border)',
                  }}
                >
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead
                      className="border-b font-medium sticky top-0"
                      style={{
                        background: 'var(--glass-raised-bg)',
                        borderColor: 'var(--glass-sunken-border)',
                        color: 'var(--text-3)',
                      }}
                    >
                      <tr>
                        <th className="py-2 px-3">ID</th>
                        <th className="py-2 px-3">Conf</th>
                        <th className="py-2 px-3">x</th>
                        <th className="py-2 px-3">y</th>
                        <th className="py-2 px-3">w</th>
                        <th className="py-2 px-3">h</th>
                      </tr>
                    </thead>
                    <tbody
                      className="divide-y"
                      style={{ borderColor: 'var(--glass-sunken-border)' }}
                    >
                      {boxes.map((b, idx) => {
                        const w = Math.round(b.x2 - b.x1);
                        const h = Math.round(b.y2 - b.y1);
                        const isHovered = hoveredBoxIdx === idx;
                        const isSelected = selectedBoxIdx === idx;

                        return (
                          <tr
                            key={idx}
                            ref={(el) => (tableRowRefs.current[idx] = el)}
                            onClick={() => setSelectedBoxIdx(idx)}
                            onMouseEnter={() => setHoveredBoxIdx(idx)}
                            onMouseLeave={() => setHoveredBoxIdx(null)}
                            className="transition-colors duration-150 cursor-pointer"
                            style={{
                              background:
                                isSelected
                                  ? 'rgba(255, 159, 10, 0.25)'
                                  : isHovered
                                  ? 'var(--accent-tint)'
                                  : undefined,
                            }}
                          >
                            <td className="py-2 px-3 font-semibold" style={{ color: 'var(--crack)' }}>
                              #{idx + 1}
                            </td>
                            <td className="py-2 px-3" style={{ color: 'var(--text-1)' }}>
                              {(b.confidence * 100).toFixed(0)}%
                            </td>
                            <td className="py-2 px-3" style={{ color: 'var(--text-3)' }}>
                              {Math.round(b.x1)}
                            </td>
                            <td className="py-2 px-3" style={{ color: 'var(--text-3)' }}>
                              {Math.round(b.y1)}
                            </td>
                            <td className="py-2 px-3" style={{ color: 'var(--text-3)' }}>
                              {w}
                            </td>
                            <td className="py-2 px-3" style={{ color: 'var(--text-3)' }}>
                              {h}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="border-t" style={{ borderColor: 'var(--glass-sunken-border)' }} />

            {/* Section 4: Engineering Notes & Sign-Off */}
            <div className="space-y-3 text-xs">
              <span className="text-[11px] font-medium tracking-wider uppercase block" style={{ color: 'var(--text-3)' }}>
                Field validation
              </span>

              {/* Status Row */}
              <div
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: 'var(--glass-sunken-bg)',
                  border: '1px solid var(--glass-sunken-border)',
                }}
              >
                <div>
                  <span className="block font-medium text-xs" style={{ color: 'var(--text-1)' }}>
                    {isReviewed ? 'Validated' : 'Pending review'}
                  </span>
                  <span className="block text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {isReviewed && reviewedAt ? reviewedAt : 'Awaiting sign-off'}
                  </span>
                </div>
                <Button
                  variant={isReviewed ? 'secondary' : 'primary'}
                  size="sm"
                  icon={isReviewed ? Check : CheckCircle2}
                  onClick={toggleReviewStatus}
                >
                  {isReviewed ? 'Reviewed' : 'Sign off'}
                </Button>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  Observations &amp; notes
                </label>
                <textarea
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder="Record structural observations, remediation priority..."
                  rows={2}
                  className="w-full p-2.5 text-xs outline-none resize-none transition-colors"
                  style={{
                    background: 'var(--glass-sunken-bg)',
                    border: '1px solid var(--glass-sunken-border)',
                    borderRadius: 'var(--r-control)',
                    color: 'var(--text-1)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Action Buttons (Download Annotated Image, Save, Export PDF) */}
          <div
            className="flex flex-col gap-2 pt-3 border-t flex-shrink-0"
            style={{ borderColor: 'var(--glass-sunken-border)' }}
          >
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handleDownloadAnnotatedImage}
              loading={isExporting}
              className="w-full"
            >
              Download annotated image
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Save}
                onClick={handleSave}
                className="flex-1"
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportPdf}
                className="flex-1"
              >
                Export PDF
              </Button>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  UploadCloud,
  Layers,
  Activity,
} from 'lucide-react';
import { AnalyzeResult, resolveImageUrl } from '../services/api';

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
  const [viewMode, setViewMode] = useState<'boxes' | 'original' | 'mask'>('boxes');
  const [hoveredBoxIdx, setHoveredBoxIdx] = useState<number | null>(null);

  // Zoom and pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

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

  const boxes = result.boxes || [];

  // Plain wording verdict
  const verdictText =
    boxes.length > 0
      ? `${boxes.length} crack region${boxes.length === 1 ? '' : 's'} found`
      : result.is_crack
      ? 'Cracks detected'
      : 'No crack found';

  const confidencePct = (result.confidence * 100).toFixed(1);

  // Crack severity estimation based on count & confidence
  const severityLabel =
    boxes.length >= 4 || result.confidence > 0.92
      ? 'Critical'
      : boxes.length >= 2 || result.confidence > 0.75
      ? 'Moderate'
      : result.is_crack
      ? 'Minor'
      : 'None (Intact)';

  const severityColor =
    severityLabel === 'Critical'
      ? 'text-accent border-accent/30 bg-accent/15'
      : severityLabel === 'Moderate'
      ? 'text-amber-text border-amber/30 bg-amber/15'
      : severityLabel === 'Minor'
      ? 'text-accent/80 border-accent/20 bg-accent/10'
      : 'text-emerald-text border-emerald/30 bg-emerald/15';

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(4.0, Math.max(0.5, prev + delta)));
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

  const toggleReviewStatus = () => {
    if (isReviewed) {
      setIsReviewed(false);
      setReviewedAt(null);
      localStorage.removeItem(`cracksense_reviewed_${result.id}`);
      localStorage.removeItem(`cracksense_reviewed_at_${result.id}`);
    } else {
      const now = new Date().toLocaleString();
      setIsReviewed(true);
      setReviewedAt(now);
      localStorage.setItem(`cracksense_reviewed_${result.id}`, 'true');
      localStorage.setItem(`cracksense_reviewed_at_${result.id}`, now);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    localStorage.setItem(`cracksense_notes_${result.id}`, val);
  };

  const currentDisplayUrl =
    viewMode === 'boxes' && result.annotated_image_url
      ? resolveImageUrl(result.annotated_image_url)
      : resolveImageUrl(result.image_url);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] text-text-primary bg-page">
      {/* Top Action Bar */}
      <div className="h-12 border-b border-white/[0.06] px-5 flex items-center justify-between flex-shrink-0 bg-surface/70 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToDashboard}
            className="text-xs text-text-secondary hover:text-text-primary flex items-center space-x-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <span className="text-white/[0.15]">/</span>
          <span className="text-xs font-mono font-medium text-text-primary truncate max-w-sm">
            {result.filename}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onNewInspection}
            className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-hover border border-white/[0.08] text-text-primary text-xs rounded-lg transition flex items-center space-x-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5 text-accent" />
            <span>Analyze another image</span>
          </button>
        </div>
      </div>

      {/* Main Split Workbench: 65% canvas, 35% plain panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-page">
        {/* Left Column: Interactive Image Viewer (~65% width) */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/[0.06] bg-[#080B10]">
          {/* Canvas Toolbar */}
          <div className="h-11 px-4 border-b border-white/[0.06] bg-surface/50 flex items-center justify-between text-xs">
            {/* View Mode Segmented Controls */}
            <div className="flex bg-[#080B10] p-0.5 rounded-lg border border-white/[0.08]">
              <button
                onClick={() => setViewMode('original')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === 'original'
                    ? 'bg-surface-elevated text-text-primary shadow-sm border border-white/[0.08]'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Original
              </button>
              <button
                onClick={() => setViewMode('boxes')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === 'boxes'
                    ? 'bg-surface-elevated text-text-primary shadow-sm border border-white/[0.08]'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Boxes ({boxes.length})
              </button>
              <button
                onClick={() => setViewMode('mask')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  viewMode === 'mask'
                    ? 'bg-surface-elevated text-text-primary shadow-sm border border-white/[0.08]'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Mask
              </button>
            </div>

            {/* Zoom / Pan Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleZoom(-0.25)}
                className="p-1 hover:bg-surface-elevated rounded text-text-secondary hover:text-text-primary transition"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] text-text-secondary w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => handleZoom(0.25)}
                className="p-1 hover:bg-surface-elevated rounded text-text-secondary hover:text-text-primary transition"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetView}
                className="p-1 hover:bg-surface-elevated rounded text-text-secondary hover:text-text-primary ml-1 transition"
                title="Reset zoom and pan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Canvas Viewport */}
          <div
            className="flex-1 overflow-hidden relative flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
              className="relative inline-block max-w-full max-h-full"
            >
              {/* Target Image */}
              <img
                ref={imageRef}
                src={currentDisplayUrl}
                alt={result.filename}
                onLoad={handleImageLoad}
                className="block max-w-[80vw] max-h-[75vh] object-contain shadow-2xl rounded border border-white/[0.08]"
                draggable={false}
              />

              {/* Interactive SVG Bounding Box Layer */}
              {(viewMode === 'boxes' || viewMode === 'mask') && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${naturalDimensions.width} ${naturalDimensions.height}`}
                  preserveAspectRatio="none"
                >
                  {boxes.map((b, idx) => {
                    const width = b.x2 - b.x1;
                    const height = b.y2 - b.y1;
                    const isHovered = hoveredBoxIdx === idx;

                    return (
                      <g key={idx} className="pointer-events-auto cursor-pointer">
                        {/* Bounding box rectangle */}
                        <rect
                          x={b.x1}
                          y={b.y1}
                          width={width}
                          height={height}
                          fill={
                            viewMode === 'mask'
                              ? 'rgba(200, 85, 61, 0.38)'
                              : isHovered
                              ? 'rgba(200, 85, 61, 0.22)'
                              : 'none'
                          }
                          stroke="#C8553D"
                          strokeWidth={isHovered ? 3.5 : 2}
                          onMouseEnter={() => setHoveredBoxIdx(idx)}
                          onMouseLeave={() => setHoveredBoxIdx(null)}
                        />
                        {/* ID Tag */}
                        <rect
                          x={b.x1}
                          y={Math.max(0, b.y1 - 18)}
                          width={Math.max(46, (b.confidence * 100).toFixed(0).length * 8 + 28)}
                          height={18}
                          rx={3}
                          fill="#C8553D"
                        />
                        <text
                          x={b.x1 + 4}
                          y={Math.max(13, b.y1 - 5)}
                          fill="#FFFFFF"
                          fontSize="10"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="600"
                        >
                          #{idx + 1} {(b.confidence * 100).toFixed(0)}%
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            {/* Scale Bar Chip (bottom-left) */}
            <div className="absolute bottom-4 left-4 bg-[#0B0E14]/85 backdrop-blur-md border border-white/[0.08] px-3 py-1.5 text-[10px] select-none rounded-lg shadow-diffuse text-text-secondary">
              <div className="flex items-center space-x-2">
                <div
                  className="border-b-2 border-accent"
                  style={{ width: `${Math.round(80 * zoom)}px` }}
                />
                <span className="font-mono text-text-tertiary">~100 px</span>
              </div>
            </div>

            {/* Resolution Chip (bottom-right) */}
            <div className="absolute bottom-4 right-4 bg-[#0B0E14]/85 backdrop-blur-md border border-white/[0.08] px-3 py-1.5 text-[11px] font-mono text-text-secondary rounded-lg shadow-diffuse">
              {naturalDimensions.width} &times; {naturalDimensions.height} px
            </div>
          </div>
        </div>

        {/* Right Column: Sleek Engineering Panel (~35% width, ~380px) */}
        <div className="w-96 flex-shrink-0 bg-surface overflow-y-auto p-6 space-y-6 border-l border-white/[0.06]">
          {/* Section 1: Verdict & Confidence Meter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium tracking-wider text-text-tertiary uppercase">
                Inspection Verdict
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${severityColor}`}>
                {severityLabel}
              </span>
            </div>

            <h1
              className={`text-xl font-semibold tracking-tight ${
                result.is_crack || boxes.length > 0 ? 'text-accent' : 'text-emerald-text'
              }`}
            >
              {verdictText}
            </h1>

            {/* Confidence Meter */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">Confidence score</span>
                <span className="font-mono font-semibold text-text-primary">{confidencePct}%</span>
              </div>
              <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    result.is_crack || boxes.length > 0 ? 'bg-accent' : 'bg-emerald'
                  }`}
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Section 2: Image & Scan Details */}
          <div className="space-y-2.5 text-xs">
            <span className="text-[11px] font-medium tracking-wider text-text-tertiary uppercase block">
              Scan metadata
            </span>
            <div className="grid grid-cols-3 gap-1 py-0.5">
              <span className="text-text-tertiary">File</span>
              <span className="col-span-2 text-text-primary truncate font-mono">{result.filename}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 py-0.5">
              <span className="text-text-tertiary">Dimensions</span>
              <span className="col-span-2 text-text-secondary font-mono">
                {naturalDimensions.width} &times; {naturalDimensions.height} px
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 py-0.5">
              <span className="text-text-tertiary">Timestamp</span>
              <span className="col-span-2 text-text-secondary font-mono">
                {new Date(result.created_at).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 py-0.5">
              <span className="text-text-tertiary">Record ID</span>
              <span className="col-span-2 text-text-tertiary font-mono text-[10px] truncate">
                {result.id}
              </span>
            </div>
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Section 3: Detections Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium tracking-wider text-text-tertiary uppercase">
                Detections ({boxes.length})
              </span>
              <span className="text-[10px] text-text-tertiary font-mono">x, y, w, h</span>
            </div>

            {boxes.length === 0 ? (
              <p className="text-xs text-text-tertiary py-2">No crack regions detected.</p>
            ) : (
              <div className="border border-white/[0.06] rounded-lg overflow-hidden bg-surface-elevated/40">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-surface-elevated/80 border-b border-white/[0.06] text-text-tertiary font-medium">
                    <tr>
                      <th className="py-1.5 px-2.5">ID</th>
                      <th className="py-1.5 px-2.5">Conf</th>
                      <th className="py-1.5 px-2.5">x</th>
                      <th className="py-1.5 px-2.5">y</th>
                      <th className="py-1.5 px-2.5">w</th>
                      <th className="py-1.5 px-2.5">h</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-text-secondary">
                    {boxes.map((b, idx) => {
                      const w = Math.round(b.x2 - b.x1);
                      const h = Math.round(b.y2 - b.y1);
                      const isHovered = hoveredBoxIdx === idx;

                      return (
                        <tr
                          key={idx}
                          onMouseEnter={() => setHoveredBoxIdx(idx)}
                          onMouseLeave={() => setHoveredBoxIdx(null)}
                          className={`transition-colors cursor-pointer ${
                            isHovered
                              ? 'bg-accent/20 text-text-primary font-semibold'
                              : 'hover:bg-surface-hover/70'
                          }`}
                        >
                          <td className="py-1.5 px-2.5 text-accent font-bold">#{idx + 1}</td>
                          <td className="py-1.5 px-2.5">{(b.confidence * 100).toFixed(0)}%</td>
                          <td className="py-1.5 px-2.5 text-text-tertiary">{Math.round(b.x1)}</td>
                          <td className="py-1.5 px-2.5 text-text-tertiary">{Math.round(b.y1)}</td>
                          <td className="py-1.5 px-2.5 text-text-tertiary">{w}</td>
                          <td className="py-1.5 px-2.5 text-text-tertiary">{h}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Section 4: Review, Notes & Inspector Sign-Off */}
          <div className="space-y-3.5 text-xs">
            <span className="text-[11px] font-medium tracking-wider text-text-tertiary uppercase block">
              Inspection review
            </span>

            {/* Inspector sign-off status box */}
            <div className="flex items-center justify-between p-3.5 bg-surface-elevated/40 border border-white/[0.06] rounded-xl">
              <div>
                <span className="block font-medium text-text-primary">
                  {isReviewed ? 'Marked as reviewed' : 'Pending engineer review'}
                </span>
                <span className="block text-[10px] text-text-tertiary mt-0.5">
                  {isReviewed && reviewedAt ? `Signed off on ${reviewedAt}` : 'Awaiting structural validation'}
                </span>
              </div>
              <button
                onClick={toggleReviewStatus}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center space-x-1.5 font-medium shadow-sm ${
                  isReviewed
                    ? 'bg-emerald/15 text-emerald-text border border-emerald/30'
                    : 'bg-gradient-to-r from-accent to-[#B64A34] text-white hover:shadow-[0_0_15px_rgba(200,85,61,0.35)]'
                }`}
              >
                {isReviewed ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Reviewed</span>
                  </>
                ) : (
                  <span>Mark reviewed</span>
                )}
              </button>
            </div>

            {/* Notes textarea */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-text-secondary block">Engineering observations</label>
              <textarea
                value={notes}
                onChange={handleNotesChange}
                placeholder="Enter field notes, crack severity, structural recommendations..."
                rows={3}
                className="w-full bg-[#080B10] border border-white/[0.08] rounded-lg p-2.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent resize-none font-sans transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

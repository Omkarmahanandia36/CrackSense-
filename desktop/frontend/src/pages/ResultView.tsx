import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Download,
  UploadCloud,
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

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(4.0, Math.max(0.5, prev + delta)));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
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
    <div className="flex flex-col h-[calc(100vh-2rem)] text-zinc-800">
      {/* Top action bar */}
      <div className="h-11 border-b border-zinc-200 px-4 flex items-center justify-between flex-shrink-0 bg-white">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToDashboard}
            className="text-xs text-zinc-600 hover:text-zinc-900 flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <span className="text-zinc-300">/</span>
          <span className="text-xs font-medium text-zinc-900 truncate max-w-sm">
            {result.filename}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onNewInspection}
            className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs rounded transition flex items-center space-x-1"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Analyze another image</span>
          </button>
        </div>
      </div>

      {/* Main split workbench: 65% canvas, 35% plain panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-zinc-50">
        {/* Left Column: Interactive Image Viewer (~65% width) */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-200 bg-[#f4f5f7]">
          {/* Canvas Toolbar */}
          <div className="h-10 px-4 border-b border-zinc-200 bg-white flex items-center justify-between text-xs">
            {/* View Mode Segmented Controls */}
            <div className="flex border border-zinc-200 rounded overflow-hidden">
              <button
                onClick={() => setViewMode('original')}
                className={`px-3 py-1 font-medium transition ${
                  viewMode === 'original'
                    ? 'bg-zinc-800 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                Original
              </button>
              <button
                onClick={() => setViewMode('boxes')}
                className={`px-3 py-1 font-medium border-l border-zinc-200 transition ${
                  viewMode === 'boxes'
                    ? 'bg-zinc-800 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                Boxes ({boxes.length})
              </button>
              <button
                onClick={() => setViewMode('mask')}
                className={`px-3 py-1 font-medium border-l border-zinc-200 transition ${
                  viewMode === 'mask'
                    ? 'bg-zinc-800 text-white'
                    : 'bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                Mask
              </button>
            </div>

            {/* Zoom / Pan Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleZoom(-0.25)}
                className="p-1 hover:bg-zinc-100 rounded text-zinc-600"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] text-zinc-500 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => handleZoom(0.25)}
                className="p-1 hover:bg-zinc-100 rounded text-zinc-600"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetView}
                className="p-1 hover:bg-zinc-100 rounded text-zinc-600 ml-1"
                title="Reset zoom and pan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Canvas */}
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
                className="block max-w-[80vw] max-h-[75vh] object-contain shadow-sm border border-zinc-300"
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
                              ? 'rgba(201, 42, 42, 0.35)'
                              : isHovered
                              ? 'rgba(201, 42, 42, 0.15)'
                              : 'none'
                          }
                          stroke="#c92a2a"
                          strokeWidth={isHovered ? 3 : 1.75}
                          onMouseEnter={() => setHoveredBoxIdx(idx)}
                          onMouseLeave={() => setHoveredBoxIdx(null)}
                        />
                        {/* ID Tag */}
                        <rect
                          x={b.x1}
                          y={Math.max(0, b.y1 - 16)}
                          width={Math.max(42, (b.confidence * 100).toFixed(0).length * 8 + 26)}
                          height={16}
                          fill="#c92a2a"
                        />
                        <text
                          x={b.x1 + 3}
                          y={Math.max(12, b.y1 - 4)}
                          fill="#ffffff"
                          fontSize="10"
                          fontFamily="monospace"
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

            {/* Practical Detail: Scale Bar (bottom-left) */}
            <div className="absolute bottom-3 left-3 bg-white/90 border border-zinc-300 px-2.5 py-1 text-[10px] select-none rounded shadow-sm">
              <div className="flex items-center space-x-1.5">
                <div
                  className="border-b-2 border-zinc-800"
                  style={{ width: `${Math.round(80 * zoom)}px` }}
                />
                <span className="font-mono text-zinc-700">~100 px</span>
              </div>
            </div>

            {/* Practical Detail: Resolution (bottom-right) */}
            <div className="absolute bottom-3 right-3 bg-white/90 border border-zinc-300 px-2.5 py-1 text-[11px] font-mono text-zinc-600 rounded shadow-sm">
              {naturalDimensions.width} &times; {naturalDimensions.height} px
            </div>
          </div>
        </div>

        {/* Right Column: Plain Engineering Panel (~35% width, ~380px) */}
        <div className="w-96 flex-shrink-0 bg-white overflow-y-auto p-5 space-y-5 border-l border-zinc-200">
          {/* Section 1: Verdict */}
          <div>
            <span className="text-[11px] text-zinc-500 font-medium">Verdict</span>
            <h1
              className={`text-lg font-semibold tracking-tight mt-0.5 ${
                result.is_crack || boxes.length > 0 ? 'text-[#c92a2a]' : 'text-zinc-900'
              }`}
            >
              {verdictText}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              <span className="font-mono font-medium text-zinc-800">{confidencePct}%</span> model confidence
            </p>
          </div>

          <div className="border-t border-zinc-200" />

          {/* Section 2: Image & Scan Details */}
          <div className="space-y-2 text-xs">
            <span className="text-[11px] text-zinc-500 font-medium block">Scan metadata</span>
            <div className="grid grid-cols-3 gap-1 py-0.5">
              <span className="text-zinc-500">File</span>
              <span className="col-span-2 text-zinc-900 truncate font-mono">{result.filename}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 py-0.5">
              <span className="text-zinc-500">Dimensions</span>
              <span className="col-span-2 text-zinc-800 font-mono">
                {naturalDimensions.width} &times; {naturalDimensions.height} px
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 py-0.5">
              <span className="text-zinc-500">Timestamp</span>
              <span className="col-span-2 text-zinc-800 font-mono">
                {new Date(result.created_at).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 py-0.5">
              <span className="text-zinc-500">Inspection ID</span>
              <span className="col-span-2 text-zinc-500 font-mono text-[10px] truncate">
                {result.id}
              </span>
            </div>
          </div>

          <div className="border-t border-zinc-200" />

          {/* Section 3: Detections Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-medium">
                Detections ({boxes.length})
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">x, y, w, h</span>
            </div>

            {boxes.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">No crack regions detected.</p>
            ) : (
              <div className="border border-zinc-200 rounded overflow-hidden">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                    <tr>
                      <th className="py-1 px-2">ID</th>
                      <th className="py-1 px-2">Conf</th>
                      <th className="py-1 px-2">x</th>
                      <th className="py-1 px-2">y</th>
                      <th className="py-1 px-2">w</th>
                      <th className="py-1 px-2">h</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-zinc-700">
                    {boxes.map((b, idx) => {
                      const w = Math.round(b.x2 - b.x1);
                      const h = Math.round(b.y2 - b.y1);
                      const isHovered = hoveredBoxIdx === idx;

                      return (
                        <tr
                          key={idx}
                          onMouseEnter={() => setHoveredBoxIdx(idx)}
                          onMouseLeave={() => setHoveredBoxIdx(null)}
                          className={`transition cursor-pointer ${
                            isHovered
                              ? 'bg-red-50 text-zinc-900 font-semibold'
                              : 'hover:bg-zinc-50'
                          }`}
                        >
                          <td className="py-1 px-2 text-[#c92a2a]">#{idx + 1}</td>
                          <td className="py-1 px-2">{(b.confidence * 100).toFixed(0)}%</td>
                          <td className="py-1 px-2 text-zinc-500">{Math.round(b.x1)}</td>
                          <td className="py-1 px-2 text-zinc-500">{Math.round(b.y1)}</td>
                          <td className="py-1 px-2 text-zinc-500">{w}</td>
                          <td className="py-1 px-2 text-zinc-500">{h}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200" />

          {/* Section 4: Review, Notes & Inspector */}
          <div className="space-y-3 text-xs">
            <span className="text-[11px] text-zinc-500 font-medium block">
              Inspection review
            </span>

            {/* Inspector sign-off status */}
            <div className="flex items-center justify-between p-2.5 bg-zinc-50 border border-zinc-200 rounded">
              <div>
                <span className="block font-medium text-zinc-900">
                  {isReviewed ? 'Marked as reviewed' : 'Pending engineer review'}
                </span>
                <span className="block text-[10px] text-zinc-500 mt-0.5">
                  {isReviewed && reviewedAt ? `Signed off on ${reviewedAt}` : 'Awaiting sign-off'}
                </span>
              </div>
              <button
                onClick={toggleReviewStatus}
                className={`px-2.5 py-1 text-xs rounded transition flex items-center space-x-1 ${
                  isReviewed
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                    : 'bg-[#c92a2a] hover:bg-[#b02525] text-white font-medium'
                }`}
              >
                {isReviewed ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Reviewed</span>
                  </>
                ) : (
                  <span>Mark reviewed</span>
                )}
              </button>
            </div>

            {/* Notes textarea */}
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-600 block">Engineering observations</label>
              <textarea
                value={notes}
                onChange={handleNotesChange}
                placeholder="Enter field notes, crack severity, structural recommendations..."
                rows={3}
                className="w-full bg-white border border-zinc-300 rounded p-2 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 resize-none font-sans"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

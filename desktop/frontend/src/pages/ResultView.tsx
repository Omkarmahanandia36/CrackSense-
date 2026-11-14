import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  UploadCloud,
  Layers,
  Calendar,
  FileText,
} from 'lucide-react';
import { AnalyzeResult } from '../services/api';
import { ConfidenceBar } from '../components/ConfidenceBar';

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
  const [activeTab, setActiveTab] = useState<'side_by_side' | 'analysed' | 'original'>('side_by_side');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-100">Inspection Analysis Report</h2>
              <span
                className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                  result.is_crack
                    ? 'bg-red-950 text-red-400 border border-red-800/60'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                }`}
              >
                {result.predicted_class}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono flex items-center space-x-2 mt-0.5">
              <span>File: {result.filename}</span>
              <span>&bull;</span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(result.created_at).toLocaleString()}</span>
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={onNewInspection}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center space-x-1.5 transition shadow-lg shadow-blue-600/20"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Inspect Another Image</span>
        </button>
      </div>

      {/* Main Analysis Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Comparison */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Visual Comparison (Original vs Analysed)</span>
              </span>

              {/* View Selector Tabs */}
              <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setActiveTab('side_by_side')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    activeTab === 'side_by_side'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Side-by-Side
                </button>
                <button
                  onClick={() => setActiveTab('analysed')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    activeTab === 'analysed'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Analysed
                </button>
                <button
                  onClick={() => setActiveTab('original')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    activeTab === 'original'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Original
                </button>
              </div>
            </div>

            {/* Image Viewer Frame */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 p-2 min-h-64 flex items-center justify-center">
              {activeTab === 'side_by_side' && (
                <div className="grid grid-cols-2 gap-2 w-full">
                  <div className="space-y-1 text-center">
                    <span className="text-[10px] text-slate-400 font-mono block">Original Image</span>
                    <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                      <img
                        src={result.image_url}
                        alt="Original concrete patch"
                        className="w-full h-auto object-contain max-h-72 mx-auto"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-center">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Analysed Classification
                    </span>
                    <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                      <img
                        src={result.image_url}
                        alt="Analysed concrete overlay"
                        className="w-full h-auto object-contain max-h-72 mx-auto"
                      />
                      {/* Detection Tag Overlay */}
                      <div className="absolute top-2 left-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-lg ${
                            result.is_crack
                              ? 'bg-red-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {result.is_crack ? 'CRACK DETECTED' : 'SURFACE CLEAR'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'analysed' && (
                <div className="relative w-full text-center">
                  <img
                    src={result.image_url}
                    alt="Analysed photograph"
                    className="w-auto max-h-80 mx-auto rounded-lg object-contain"
                  />
                  <div className="absolute top-3 left-3">
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded shadow-lg ${
                        result.is_crack ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {result.is_crack ? 'CRACK DETECTED' : 'CLEAR'}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'original' && (
                <div className="w-full text-center">
                  <img
                    src={result.image_url}
                    alt="Original photograph"
                    className="w-auto max-h-80 mx-auto rounded-lg object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Metrics & Confidence */}
        <div className="lg:col-span-5 space-y-4">
          {/* Classification Status Badge */}
          <div
            className={`rounded-2xl p-5 border flex items-center space-x-4 ${
              result.is_crack
                ? 'bg-red-950/40 border-red-800/50'
                : 'bg-emerald-950/40 border-emerald-800/50'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                result.is_crack
                  ? 'bg-red-950 border border-red-700/60 text-red-400'
                  : 'bg-emerald-950 border border-emerald-700/60 text-emerald-400'
              }`}
            >
              {result.is_crack ? (
                <ShieldAlert className="w-7 h-7" />
              ) : (
                <ShieldCheck className="w-7 h-7" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                {result.is_crack ? 'Structural Fracture Found' : 'Clean Surface Verified'}
              </h3>
              <p className="text-xs text-slate-400">
                {result.is_crack
                  ? 'Surface shows linear concrete crack patterns.'
                  : 'No visual surface cracks detected in this patch.'}
              </p>
            </div>
          </div>

          {/* Confidence Bar Component */}
          <ConfidenceBar
            confidence={result.confidence}
            isCrack={result.is_crack}
            probabilities={result.probabilities}
          />

          {/* Model Specification Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2 text-slate-400 font-mono">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">Inspection ID:</span>
              <span className="text-slate-300 font-mono truncate max-w-[180px]">{result.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">Architecture:</span>
              <span className="text-slate-300">ResNet-18 (Phase 2 Fine-Tuned)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Input Resolution:</span>
              <span className="text-slate-300">227 × 227 (Normalized RGB)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  FileText,
  Activity,
  History,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Download,
  Eye,
  Sliders,
  ChevronRight
} from 'lucide-react';

interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  label: string;
}

interface AnalysisData {
  id: number;
  uuid: string;
  filename: string;
  is_crack: boolean;
  confidence: number;
  predicted_class: string;
  severity: string;
  crack_percentage: number;
  bounding_boxes: BoundingBox[];
  probabilities?: { positive: number; negative: number };
  image_url: string;
  overlay_url?: string;
  created_at: string;
}

interface InspectionHistoryItem {
  id: number;
  uuid: string;
  filename: string;
  is_crack: boolean;
  confidence: number;
  severity: string;
  crack_percentage: number;
  image_url: string;
  overlay_url?: string;
  created_at: string;
}

interface SystemStatus {
  status: string;
  app_name: string;
  torch_version: string;
  cuda_available: boolean;
  device_name: string;
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisData | null>(null);
  const [history, setHistory] = useState<InspectionHistoryItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inspect' | 'history' | 'models'>('inspect');
  const [viewMode, setViewMode] = useState<'side_by_side' | 'annotated' | 'original'>('side_by_side');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll or check system health on mount
  useEffect(() => {
    fetchSystemStatus();
    fetchHistory();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('/api/v1/health');
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch {
      // Backend may be offline or starting up
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/v1/inspections?limit=15');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // Silent catch
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/v1/inspections/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Analysis failed. Please check backend connection.');
      }

      const data: AnalysisData = await res.json();
      setCurrentAnalysis(data);
      fetchHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred during image inspection');
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-red-950/80 text-red-400 border border-red-700/50';
      case 'medium':
        return 'bg-amber-950/80 text-amber-400 border border-amber-700/50';
      case 'low':
        return 'bg-yellow-950/80 text-yellow-400 border border-yellow-700/50';
      default:
        return 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight flex items-center space-x-2">
                <span>CrackSense AI</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  v1.0-alpha
                </span>
              </h1>
              <p className="text-xs text-slate-400">Deep Learning Concrete Surface Inspection</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {systemStatus ? (
              <div className="flex items-center space-x-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-300 font-mono">{systemStatus.device_name}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">PyTorch {systemStatus.torch_version}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-slate-400">Connecting to Backend...</span>
              </div>
            )}

            <nav className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('inspect')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  activeTab === 'inspect'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Inspection
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                History ({history.length})
              </button>
              <button
                onClick={() => setActiveTab('models')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  activeTab === 'models'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Models
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {activeTab === 'inspect' && (
          <>
            {/* Left Upload & Controls Column */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
                  <UploadCloud className="w-4 h-4 text-blue-400" />
                  <span>Upload Concrete Surface Image</span>
                </h2>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                    selectedFile
                      ? 'border-blue-500/50 bg-blue-950/10'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {previewUrl ? (
                    <div className="space-y-3">
                      <div className="relative max-h-52 overflow-hidden rounded-lg mx-auto border border-slate-800">
                        <img
                          src={previewUrl}
                          alt="Selected concrete patch"
                          className="w-full h-auto object-cover max-h-52"
                        />
                      </div>
                      <p className="text-xs text-slate-300 font-mono truncate">{selectedFile?.name}</p>
                      <p className="text-xs text-blue-400">Click or drag a new image to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-200">
                        Drag & Drop concrete photograph here
                      </p>
                      <p className="text-xs text-slate-500">
                        JPG, PNG, BMP up to 15MB (Standard 227×227 RGB or higher)
                      </p>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="mt-3 p-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={!selectedFile || analyzing}
                  className={`mt-4 w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center space-x-2 transition shadow-lg ${
                    !selectedFile || analyzing
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                  }`}
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Executing Deep Learning Inference...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4" />
                      <span>Start CrackSense AI Analysis</span>
                    </>
                  )}
                </button>
              </div>

              {/* Inspection Architecture Summary Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-2 text-slate-400">
                <h3 className="font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span>3-Stage Multi-Model Inspection Pipeline</span>
                </h3>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <span className="font-semibold text-slate-200 block">Stage 1</span>
                    <span className="text-slate-400">ResNet</span>
                    <span className="text-[10px] text-slate-500 block">Classification</span>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <span className="font-semibold text-slate-200 block">Stage 2</span>
                    <span className="text-slate-400">YOLO</span>
                    <span className="text-[10px] text-slate-500 block">Bounding Boxes</span>
                  </div>
                  <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                    <span className="font-semibold text-slate-200 block">Stage 3</span>
                    <span className="text-slate-400">U-Net</span>
                    <span className="text-[10px] text-slate-500 block">Segmentation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Results & Visualisation Column */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              {currentAnalysis ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
                  {/* Result Header Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="flex items-center space-x-3">
                      {currentAnalysis.is_crack ? (
                        <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-700/50 flex items-center justify-center text-red-400">
                          <ShieldAlert className="w-6 h-6" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-base text-slate-100">
                            {currentAnalysis.is_crack ? 'Crack Detected' : 'Clear Concrete Surface'}
                          </h3>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getSeverityBadgeClass(
                              currentAnalysis.severity
                            )}`}
                          >
                            Severity: {currentAnalysis.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          Confidence: {(currentAnalysis.confidence * 100).toFixed(1)}% | Area:{' '}
                          {currentAnalysis.crack_percentage.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <a
                      href={`/api/v1/inspections/${currentAnalysis.id}/report`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center space-x-2 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Download PDF Report</span>
                    </a>
                  </div>

                  {/* Visual Analysis View */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Visual Comparison</span>
                      </span>

                      <div className="flex items-center space-x-1 text-xs bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button
                          onClick={() => setViewMode('side_by_side')}
                          className={`px-2 py-0.5 rounded ${
                            viewMode === 'side_by_side'
                              ? 'bg-slate-800 text-blue-400 font-medium'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Side-by-Side
                        </button>
                        <button
                          onClick={() => setViewMode('annotated')}
                          className={`px-2 py-0.5 rounded ${
                            viewMode === 'annotated'
                              ? 'bg-slate-800 text-blue-400 font-medium'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Annotated
                        </button>
                        <button
                          onClick={() => setViewMode('original')}
                          className={`px-2 py-0.5 rounded ${
                            viewMode === 'original'
                              ? 'bg-slate-800 text-blue-400 font-medium'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Original
                        </button>
                      </div>
                    </div>

                    <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center min-h-64">
                      {viewMode === 'side_by_side' && currentAnalysis.overlay_url && (
                        <img
                          src={currentAnalysis.overlay_url}
                          alt="Side-by-side analysis"
                          className="w-full h-auto object-contain max-h-[380px]"
                        />
                      )}
                      {viewMode === 'annotated' && currentAnalysis.overlay_url && (
                        <img
                          src={currentAnalysis.overlay_url}
                          alt="Annotated inspection overlay"
                          className="w-full h-auto object-contain max-h-[380px]"
                        />
                      )}
                      {viewMode === 'original' && (
                        <img
                          src={currentAnalysis.image_url}
                          alt="Original concrete photograph"
                          className="w-full h-auto object-contain max-h-[380px]"
                        />
                      )}
                    </div>
                  </div>

                  {/* Quantitative Finding Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[11px] text-slate-400 block">Class</span>
                      <span className="text-sm font-bold text-slate-200 font-mono">
                        {currentAnalysis.predicted_class}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[11px] text-slate-400 block">Confidence</span>
                      <span className="text-sm font-bold text-blue-400 font-mono">
                        {(currentAnalysis.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[11px] text-slate-400 block">Surface Area</span>
                      <span className="text-sm font-bold text-slate-200 font-mono">
                        {currentAnalysis.crack_percentage.toFixed(2)}%
                      </span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-[11px] text-slate-400 block">Bounding Boxes</span>
                      <span className="text-sm font-bold text-slate-200 font-mono">
                        {currentAnalysis.bounding_boxes.length} Regions
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty state when no image has been analyzed yet */
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3 h-full min-h-[400px]">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
                    <Sliders className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-slate-300 text-base">No Active Inspection</h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Upload a concrete surface patch and run analysis to inspect crack classification, bounding box coordinates, and pixel segmentation.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="lg:col-span-12 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="font-bold text-lg text-slate-100 flex items-center space-x-2">
                  <History className="w-5 h-5 text-blue-400" />
                  <span>Inspection History & Records</span>
                </h2>
                <p className="text-xs text-slate-400">Stored inspection logs and AI prediction results</p>
              </div>
              <button
                onClick={fetchHistory}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center space-x-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-center text-slate-500 py-8 text-sm">No inspection history found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex space-x-3 hover:border-slate-700 transition"
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-800">
                      <img
                        src={item.overlay_url || item.image_url}
                        alt={item.filename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              item.is_crack
                                ? 'bg-red-950 text-red-400 border border-red-800/60'
                                : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            }`}
                          >
                            {item.is_crack ? 'CRACK' : 'CLEAR'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {(item.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-200 truncate mt-1">{item.filename}</p>
                        <p className="text-[11px] text-slate-500">Severity: {item.severity}</p>
                      </div>

                      <a
                        href={`/api/v1/inspections/${item.id}/report`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center space-x-1 mt-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>PDF Report</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Models & Diagnostics Tab */}
        {activeTab === 'models' && (
          <div className="lg:col-span-12 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <h2 className="font-bold text-lg text-slate-100 flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-blue-400" />
                <span>AI Models & Hardware Diagnostics</span>
              </h2>
              <p className="text-xs text-slate-400">Deep learning inference backends and configuration</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-200 text-sm">ResNet Classifier</h3>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800/60 font-mono">
                    Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Binary classifier for crack / no-crack identification on 227×227 RGB concrete patches.
                </p>
                <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
                  Stage: 1 | Architecture: ResNet18
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-200 text-sm">YOLO Localizer</h3>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800/60 font-mono">
                    Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Object detection network determining bounding box coordinates and regions of interest.
                </p>
                <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
                  Stage: 2 | Format: [X1, Y1, X2, Y2]
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-200 text-sm">U-Net Segmenter</h3>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800/60 font-mono">
                    Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Encoder-decoder with skip connections generating pixel-level binary crack masks.
                </p>
                <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
                  Stage: 3 | Resolution: 256×256
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-600">
        CrackSense AI &bull; AI-Powered Concrete Crack Detection System &bull; For Engineering Inspection Support
      </footer>
    </div>
  );
}

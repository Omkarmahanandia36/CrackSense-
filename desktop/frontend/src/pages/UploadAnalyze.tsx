import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  RefreshCw,
  AlertTriangle,
  FileCheck,
  X,
  Play,
} from 'lucide-react';
import { uploadAndAnalyzeImage, AnalyzeResult } from '../services/api';

interface UploadAnalyzeProps {
  onAnalysisSuccess: (result: AnalyzeResult) => void;
}

export const UploadAnalyze: React.FC<UploadAnalyzeProps> = ({ onAnalysisSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|bmp|webp)$/i)) {
      setErrorMsg('Invalid file format. Please upload JPG, PNG, BMP, or WebP images.');
      return;
    }

    // Validate size (15MB limit)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('File exceeds 15 MB limit.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMsg(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRunInference = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const result = await uploadAndAnalyzeImage(selectedFile);
      onAnalysisSuccess(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to analyze concrete photograph. Ensure backend is running.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1 text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
          Upload & Analyze Concrete Surface
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Upload a concrete patch photograph to classify whether it contains fractures or is structurally intact.
        </p>
      </div>

      {/* Drag & Drop Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer relative ${
          selectedFile
            ? 'border-blue-500/50 bg-blue-950/10'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          accept="image/*"
          className="hidden"
        />

        {previewUrl ? (
          <div className="space-y-4">
            <div className="relative max-h-72 inline-block rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
              <img
                src={previewUrl}
                alt="Selected preview"
                className="max-h-72 w-auto object-contain mx-auto"
              />
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-slate-300 hover:text-white hover:bg-red-600 transition"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center space-x-2 text-xs text-slate-300 font-mono">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>{selectedFile?.name}</span>
              <span className="text-slate-500">
                ({((selectedFile?.size || 0) / 1024).toFixed(1)} KB)
              </span>
            </div>
          </div>
        ) : (
          <div className="py-10 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-200">
                Click to browse or drag & drop photograph here
              </p>
              <p className="text-xs text-slate-500">
                JPG, PNG, BMP, or WebP &bull; Standard 227×227 RGB patch or macro surface photo
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Run Analysis Action Button */}
      <button
        onClick={handleRunInference}
        disabled={!selectedFile || isAnalyzing}
        className={`w-full py-3.5 px-5 rounded-xl font-medium text-sm flex items-center justify-center space-x-2 transition shadow-xl ${
          !selectedFile || isAnalyzing
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40'
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
        }`}
      >
        {isAnalyzing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Analyzing Image with ResNet-18...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            <span>Run AI Crack Detection</span>
          </>
        )}
      </button>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { UploadCloud, AlertCircle, X, ArrowRight, FileImage, ShieldCheck } from 'lucide-react';
import { uploadAndAnalyzeImage, AnalyzeResult } from '../services/api';

interface UploadAnalyzeProps {
  onAnalysisSuccess: (result: AnalyzeResult) => void;
}

export const UploadAnalyze: React.FC<UploadAnalyzeProps> = ({ onAnalysisSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['jpg', 'jpeg', 'png', 'bmp', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !validExtensions.includes(ext)) {
      setErrorMessage(`Unsupported format .${ext}. Use JPG, PNG, BMP, or WebP.`);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage(`File exceeds 15 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Read natural dimensions
    const img = new Image();
    img.onload = () => {
      setImageMeta({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageMeta(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRunAnalysis = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await uploadAndAnalyzeImage(selectedFile);
      onAnalysisSuccess(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Inspection analysis failed. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-rise">
      {/* Title */}
      <div className="border-b border-white/[0.06] pb-5">
        <h1 className="text-2xl md:text-3xl font-semibold text-text-primary tracking-tight">
          Analyze concrete image
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Full-resolution patch tiling (ResNet-18) and bounding-box crack localization (YOLOv8)
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-accent/10 border border-accent/25 rounded-xl text-xs text-text-primary flex items-start space-x-3">
          <AlertCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Zone / Drop area */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-16 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200 select-none ${
            isDragging
              ? 'border-accent bg-accent/10 shadow-[0_0_25px_rgba(200,85,61,0.25)]'
              : 'border-white/10 hover:border-white/20 bg-surface/40 hover:bg-surface/70'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png,.bmp,.webp"
            className="hidden"
          />

          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-surface-elevated/80 border border-white/[0.08] flex items-center justify-center text-accent">
            <UploadCloud className="w-7 h-7" />
          </div>

          <p className="text-sm font-medium text-text-primary">
            Click to upload concrete photo, or drag and drop
          </p>
          <p className="text-xs text-text-tertiary mt-1.5 font-mono">
            JPG, PNG, BMP, WebP &bull; Max 15 MB
          </p>
        </div>
      ) : (
        /* Selected File Preview & Inspection Controls */
        <div className="card-surface p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-lg bg-surface-elevated border border-white/[0.08] overflow-hidden flex items-center justify-center flex-shrink-0">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileImage className="w-5 h-5 text-text-tertiary" />
                )}
              </div>
              <div>
                <span className="font-mono text-xs font-semibold text-text-primary block truncate max-w-md">
                  {selectedFile.name}
                </span>
                <span className="text-[11px] text-text-tertiary font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                  {imageMeta && ` • ${imageMeta.width} × ${imageMeta.height} px`}
                </span>
              </div>
            </div>

            <button
              onClick={handleClear}
              disabled={loading}
              className="p-1.5 hover:bg-surface-elevated rounded-lg text-text-tertiary hover:text-text-primary transition"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Full Image Preview or Skeleton Loader */}
          {loading ? (
            <div className="p-8 rounded-lg bg-[#080B10] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-text-secondary flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  <span>Running neural inference pipeline...</span>
                </span>
                <span className="font-mono text-text-tertiary text-[11px]">ResNet-18 + YOLOv8</span>
              </div>

              {/* Skeleton loaders */}
              <div className="h-44 w-full rounded-lg skeleton" />
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="h-8 rounded skeleton" />
                <div className="h-8 rounded skeleton" />
                <div className="h-8 rounded skeleton" />
              </div>
            </div>
          ) : (
            <div className="bg-[#080B10] border border-white/[0.08] rounded-lg overflow-hidden flex items-center justify-center max-h-96 p-2">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Selected Concrete"
                  className="max-h-96 w-auto object-contain rounded"
                />
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
            <button
              onClick={handleClear}
              disabled={loading}
              className="px-3.5 py-2 text-xs text-text-secondary hover:text-text-primary transition"
            >
              Choose different file
            </button>

            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-accent to-[#B64A34] hover:shadow-[0_0_20px_rgba(200,85,61,0.35)] disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all flex items-center space-x-2 shadow-sm"
            >
              <span>{loading ? 'Processing...' : 'Run analysis'}</span>
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { UploadCloud, FileImage, AlertCircle, X, ArrowRight } from 'lucide-react';
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
    <div className="max-w-3xl mx-auto space-y-6 text-zinc-800">
      {/* Title */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Analyze concrete image</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          High-resolution crack classification (ResNet-18) and bounding-box localization (YOLOv8)
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-[#c92a2a] flex-shrink-0 mt-0.5" />
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
          className={`p-12 border-2 border-dashed rounded text-center cursor-pointer transition select-none ${
            isDragging
              ? 'border-[#c92a2a] bg-red-50/50'
              : 'border-zinc-300 hover:border-zinc-400 bg-white'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png,.bmp,.webp"
            className="hidden"
          />

          <UploadCloud className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
          <p className="text-xs font-medium text-zinc-900">
            Click to select concrete photo, or drag and drop file here
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Supports JPG, PNG, BMP &bull; Max 15 MB
          </p>
        </div>
      ) : (
        /* Selected File Preview & Inspection Controls */
        <div className="border border-zinc-200 rounded bg-white p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-zinc-100 border border-zinc-200 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="text-xs">
                <span className="font-medium text-zinc-900 block truncate max-w-md">
                  {selectedFile.name}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                  {imageMeta && ` • ${imageMeta.width} × ${imageMeta.height} px`}
                </span>
              </div>
            </div>

            <button
              onClick={handleClear}
              disabled={loading}
              className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-700"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Full Image Preview */}
          <div className="bg-zinc-50 border border-zinc-200 rounded overflow-hidden flex items-center justify-center max-h-80">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Selected Concrete"
                className="max-h-80 w-auto object-contain"
              />
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <button
              onClick={handleClear}
              disabled={loading}
              className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 transition"
            >
              Choose different file
            </button>

            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="px-4 py-2 bg-[#c92a2a] hover:bg-[#b02525] disabled:bg-zinc-300 text-white text-xs font-medium rounded transition flex items-center space-x-1.5 shadow-sm"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing neural inference...</span>
                </>
              ) : (
                <>
                  <span>Run analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

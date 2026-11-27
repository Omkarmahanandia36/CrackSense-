import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, AlertCircle, X, Check, FileImage, Camera as CameraIcon, CloudCheck, Loader2 } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { uploadAndAnalyzeImage, predictWithImageUrl, predictWithFile, waitForBackendAwake, AnalyzeResult, isNativeMobile } from '../services/api';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import {
  validateImageFile,
  compressAndResizeImage,
  getUploadSignature,
  uploadToCloudinary,
  CloudinaryUploadResult,
} from '../services/cloudinary';
import { getValidSession, saveCompleteInspection } from '../services/supabase';
import { GlassPanel, Button } from '../components/ui';

interface UploadAnalyzeProps {
  initialFile?: File | null;
  onAnalysisSuccess: (result: AnalyzeResult) => void;
}

type AnalysisStage = 'idle' | 'compressing' | 'uploading' | 'waking' | 'detecting' | 'done';

export const UploadAnalyze: React.FC<UploadAnalyzeProps> = ({ initialFile, onAnalysisSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<AnalysisStage>('idle');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [statusDetail, setStatusDetail] = useState<string>('');
  const [cloudinaryData, setCloudinaryData] = useState<CloudinaryUploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisTriggeredRef = useRef(false);

  const startAutoAnalysis = useCallback(async (file: File) => {
    setErrorMessage(null);
    setUploadPercent(0);
    setStage('compressing');
    setStatusDetail('Optimizing photo for high-speed analysis...');

    try {
      // 1. Ultra-fast client-side compression (max 1400px, quality 0.82)
      const { blob: compressedBlob, width: compW, height: compH } = await compressAndResizeImage(file, 1400, 0.82);
      setImageMeta({ width: compW, height: compH });

      // 2. Launch high-speed direct neural inference on AWS Lambda immediately
      setStage('detecting');
      setStatusDetail('Neural engine analyzing surface fissures (99% precision)...');

      // Start Cloudinary persistence concurrently in background
      const cloudinaryTask = (async () => {
        try {
          const session = await getValidSession().catch(() => null);
          const userId = session?.user?.id || 'guest';
          const sigData = await getUploadSignature(userId);
          return await uploadToCloudinary(compressedBlob, sigData, file.name, (pct) => {
            setUploadPercent(pct);
          });
        } catch (cldErr) {
          console.warn('Cloudinary background upload warning:', cldErr);
          return null;
        }
      })();

      // Direct multipart inference to AWS Lambda (completes in ~1.5 - 2.5s)
      let result: AnalyzeResult;
      try {
        result = await predictWithFile(compressedBlob, file.name, 0.06);
      } catch (err: any) {
        console.warn('Direct predict initial attempt notice, retrying:', err);
        await new Promise((r) => setTimeout(r, 1200));
        result = await predictWithFile(compressedBlob, file.name, 0.06);
      }

      // 3. Await or combine Cloudinary upload result
      const cld = await cloudinaryTask;
      if (cld?.secure_url) {
        result.image_url = cld.secure_url;
        (result as any).cloudinary_public_id = cld.public_id;
        setCloudinaryData(cld);
      } else if (previewUrl) {
        result.image_url = previewUrl;
      }

      setStage('done');
      setStatusDetail('Inspection complete! Opening defect report...');

      // 4. Persist inspection & crack boxes to Supabase under RLS
      try {
        const normalizedBoxes = (result.boxes || []).map((b: any) => ({
          x: b.x !== undefined ? b.x : (b.x1 ?? 0),
          y: b.y !== undefined ? b.y : (b.y1 ?? 0),
          width: b.width !== undefined ? b.width : Math.max(1, (b.x2 ?? 0) - (b.x1 ?? 0)),
          height: b.height !== undefined ? b.height : Math.max(1, (b.y2 ?? 0) - (b.y1 ?? 0)),
          label: b.label || 'crack',
          confidence: b.confidence ?? result.confidence ?? 0.95,
        }));

        const saved = await saveCompleteInspection({
          imageUrl: result.image_url || '',
          cloudinaryPublicId: cld?.public_id,
          result: result.is_crack ? 'crack' : 'no crack',
          confidence: result.confidence,
          boxes: normalizedBoxes,
          maskData: result.mask_png_base64,
          imageWidth: result.image_width || compW,
          imageHeight: result.image_height || compH,
          filename: file.name,
        });

        if (saved?.inspectionId) {
          result.id = saved.inspectionId;
          (result as any).inspection_id = saved.inspectionId;
          (result as any).saved_to_supabase = saved.savedToSupabase;
        }
      } catch (saveErr) {
        console.warn('Could not save to Supabase:', saveErr);
      }

      setTimeout(() => {
        onAnalysisSuccess(result);
      }, 300);
    } catch (err: any) {
      setStage('idle');
      setErrorMessage(err.message || 'Inspection analysis failed. Check network connection.');
    }
  }, [onAnalysisSuccess, previewUrl]);

  const processFile = useCallback((file: File) => {
    setErrorMessage(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file. Please select a JPG or PNG image.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      setImageMeta({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;

    // Immediately start automated analysis flow
    startAutoAnalysis(file);
  }, [startAutoAnalysis]);

  useEffect(() => {
    if (initialFile && !analysisTriggeredRef.current) {
      analysisTriggeredRef.current = true;
      processFile(initialFile);
    }
  }, [initialFile, processFile]);

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

  const handleCapturePhoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isNativeMobile()) {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera,
        });

        if (image.webPath) {
          const response = await fetch(image.webPath);
          const blob = await response.blob();
          const file = new File(
            [blob],
            `inspection_crack_${Date.now()}.${image.format || 'jpg'}`,
            { type: `image/${image.format || 'jpeg'}` }
          );
          processFile(file);
        }
      } catch (err: any) {
        // User cancelled camera dialog or camera permission denied
        if (!err?.message?.includes('User cancelled')) {
          console.warn('Camera capture notice:', err);
        }
      }
    } else {
      // Desktop (Electron / Web): Open in-app live webcam viewfinder
      setIsCameraModalOpen(true);
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
    setStage('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isAnalyzing = stage !== 'idle';

  const progressPercent =
    stage === 'compressing'
      ? 15
      : stage === 'uploading'
      ? 15 + Math.round(uploadPercent * 0.55)
      : stage === 'waking'
      ? 65
      : stage === 'detecting'
      ? 85
      : stage === 'done'
      ? 100
      : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-rise">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
          Analyze concrete image
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
          Automated multi-tile crack detection, NMS bounding-box localization, and fissure extraction
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          className="p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-fade-rise"
          style={{
            background: 'var(--crack-tint)',
            border: '1px solid rgba(255, 111, 97, 0.4)',
            color: 'var(--text-1)',
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--crack)' }} strokeWidth={1.5} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Drop Zone (Empty State) */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            glass-base p-6 sm:p-10 md:p-16 text-center cursor-pointer select-none transition-all duration-200 group border border-dashed
            ${isDragging ? 'scale-[1.01] shadow-2xl' : 'hover:bg-[--hover-bg]'}
          `}
          style={{
            borderColor: isDragging ? 'var(--accent)' : 'var(--glass-border)',
            background: isDragging ? 'var(--accent-tint)' : undefined,
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png,.bmp,.webp"
            className="hidden"
          />

          <div
            className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
            style={{
              background: 'var(--glass-sunken-bg)',
              border: '1px solid var(--glass-sunken-border)',
              color: 'var(--text-1)',
            }}
          >
            <UploadCloud className="w-7 h-7" strokeWidth={1.5} />
          </div>

          <h3 className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
            Click to upload concrete photo, or drag and drop
          </h3>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-3)' }}>
            JPG, PNG, BMP, WebP &bull; Auto-analyzes on drop
          </p>

          {/* Mobile & Tablet Quick Actions */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-sm mx-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCapturePhoto();
              }}
              className="w-full sm:w-auto px-3.5 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer bg-white text-slate-900 hover:bg-slate-100 active:scale-95 shadow-sm"
            >
              <CameraIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span>Capture Photo</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="w-full sm:w-auto px-3.5 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer glass-base text-slate-200 hover:text-white hover:bg-white/[0.06] active:scale-95"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.6} />
              <span>Choose File</span>
            </button>
          </div>
        </div>
      ) : (
        /* Selected File Preview & Automated Analysis Progress */
        <GlassPanel variant="base" className="p-6 space-y-6">
          {/* Header Info Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--glass-sunken-bg)',
                  border: '1px solid var(--glass-sunken-border)',
                }}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                ) : (
                  <FileImage className="w-5 h-5" style={{ color: 'var(--text-3)' }} strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0">
                <span className="font-mono text-xs font-semibold block truncate" style={{ color: 'var(--text-1)' }}>
                  {selectedFile.name}
                </span>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-3)' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                  {imageMeta && ` • ${imageMeta.width} × ${imageMeta.height} px`}
                </span>
              </div>
            </div>

            <button
              onClick={handleClear}
              disabled={isAnalyzing}
              className="p-1.5 rounded-lg transition-colors hover:bg-[--hover-bg] disabled:opacity-40 cursor-pointer"
              style={{ color: 'var(--text-3)' }}
              title="Remove image"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Sharp Image Preview */}
          <div
            className="w-full rounded-2xl overflow-hidden flex items-center justify-center p-2 relative"
            style={{
              background: 'var(--glass-sunken-bg)',
              border: '1px solid var(--glass-sunken-border)',
              maxHeight: 400,
            }}
          >
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Selected Concrete"
                className="max-h-[380px] w-auto object-contain rounded-xl select-none"
              />
            )}
          </div>

          {/* Thin Progress State: Uploading -> Detecting cracks -> Done */}
          <div className="space-y-3 py-1">
            <div className="flex items-center justify-between text-xs font-medium">
              {/* Step 1: Uploading */}
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    stage === 'uploading' ? 'animate-status-pulse' : ''
                  }`}
                  style={{
                    background:
                      stage === 'uploading' || stage === 'detecting' || stage === 'done'
                        ? 'var(--text-1)'
                        : 'var(--text-3)',
                  }}
                />
                <span
                  style={{
                    color:
                      stage === 'uploading'
                        ? 'var(--text-1)'
                        : stage === 'detecting' || stage === 'done'
                        ? 'var(--text-2)'
                        : 'var(--text-3)',
                  }}
                >
                  Uploading
                </span>
              </div>

              {/* Step 2: Detecting cracks */}
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    stage === 'detecting' ? 'animate-status-pulse' : ''
                  }`}
                  style={{
                    background:
                      stage === 'detecting' || stage === 'done'
                        ? 'var(--text-1)'
                        : 'var(--text-3)',
                  }}
                />
                <span
                  style={{
                    color:
                      stage === 'detecting'
                        ? 'var(--text-1)'
                        : stage === 'done'
                        ? 'var(--text-2)'
                        : 'var(--text-3)',
                  }}
                >
                  Detecting cracks
                </span>
              </div>

              {/* Step 3: Done */}
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    background: stage === 'done' ? 'var(--success)' : 'var(--text-3)',
                  }}
                />
                <span
                  style={{
                    color: stage === 'done' ? 'var(--success)' : 'var(--text-3)',
                  }}
                >
                  Done
                </span>
              </div>
            </div>

            {/* Thin animated line progress bar */}
            <div
              className="w-full h-1 rounded-full overflow-hidden"
              style={{ background: 'var(--glass-sunken-bg)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-400 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: stage === 'done' ? 'var(--success)' : 'var(--text-1)',
                }}
              />
            </div>
          </div>

          {/* Action Row */}
          <div
            className="flex items-center justify-between pt-2 border-t"
            style={{ borderColor: 'var(--glass-sunken-border)' }}
          >
            <Button
              variant="ghost"
              onClick={handleClear}
              disabled={isAnalyzing}
            >
              Cancel
            </Button>

            <span className="text-[11px] font-mono" style={{ color: 'var(--text-3)' }}>
              {statusDetail ||
                (stage === 'compressing'
                  ? 'Optimizing photo (max 1600px)...'
                  : stage === 'uploading'
                  ? `Uploading to Cloudinary (${uploadPercent}%)...`
                  : stage === 'detecting'
                  ? 'Tiled neural localization...'
                  : stage === 'done'
                  ? 'Opening inspection result...'
                  : 'Ready')}
            </span>
          </div>
        </GlassPanel>
      )}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(file) => processFile(file)}
      />
    </div>
  );
};

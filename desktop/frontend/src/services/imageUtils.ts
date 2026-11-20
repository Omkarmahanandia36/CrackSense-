export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Downscale image so the longest side is at most 2000 px, re-encode as JPEG quality ~0.85.
 * Keeps memory low and optimizes Cloudinary bandwidth.
 */
export async function downscaleImageForUpload(
  fileOrBlob: File | Blob,
  maxDimension = 2000,
  quality = 0.85
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fileOrBlob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { naturalWidth: width, naturalHeight: height } = img;

      // Downscale if longest dimension exceeds maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D rendering context is not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to encode downscaled image as JPEG'));
            return;
          }
          resolve({
            blob,
            width,
            height,
            bytes: blob.size,
          });
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for client-side downscaling'));
    };

    img.src = url;
  });
}

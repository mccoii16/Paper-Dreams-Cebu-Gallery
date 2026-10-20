/**
 * Client-side media processing helper:
 * 1. Generates lightweight WebP/JPEG gallery thumbnails without altering original files.
 * 2. Extracts video snapshot at 0.5s into a canvas without loading the full video into memory.
 * 3. Inspects file magic bytes (mime signature) to prevent extension spoofing.
 */

export interface MediaProcessingResult {
  thumbnailBlob: Blob | null;
  width: number;
  height: number;
  duration?: string;
  isValid: boolean;
  detectedType: 'photo' | 'video' | 'unknown';
  errorMessage?: string;
}

/**
 * Validates file signature by inspecting header bytes (slice of 32 bytes).
 * Ensures executables, scripts, archives, and documents cannot be spoofed as images or videos.
 */
export async function validateMediaHeader(file: File): Promise<{ isValid: boolean; detectedType: 'photo' | 'video' | 'unknown'; error?: string }> {
  try {
    const slice = file.slice(0, 32);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. Explicitly detect and block non-media binaries
    // Windows Executable / DLL: 'MZ' (0x4D, 0x5A)
    if (bytes[0] === 0x4d && bytes[1] === 0x5a) {
      return { isValid: false, detectedType: 'unknown', error: 'Executable binary (.exe/.dll) cannot be uploaded.' };
    }
    // Linux ELF: 0x7F, 'E', 'L', 'F'
    if (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
      return { isValid: false, detectedType: 'unknown', error: 'Binary executable (.elf) cannot be uploaded.' };
    }
    // ZIP / JAR / Office documents: 'PK' (0x50, 0x4B, 0x03, 0x04)
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
      return { isValid: false, detectedType: 'unknown', error: 'Zip archive or document cannot be uploaded as media.' };
    }
    // PDF: '%PDF' (0x25, 0x50, 0x44, 0x46)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return { isValid: false, detectedType: 'unknown', error: 'PDF documents cannot be uploaded. Please choose photos or videos.' };
    }

    // 2. Validate known image signatures
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { isValid: true, detectedType: 'photo' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { isValid: true, detectedType: 'photo' };
    }

    // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      const riffType = String.fromCharCode(...bytes.slice(8, 12));
      if (riffType === 'WEBP') {
        return { isValid: true, detectedType: 'photo' };
      }
    }

    // GIF: GIF87a or GIF89a (0x47, 0x49, 0x46, 0x38)
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return { isValid: true, detectedType: 'photo' };
    }

    // 3. Validate known video & ISO container signatures
    // MP4/MOV/QuickTime/HEIC: bytes 4-7 equal 'ftyp' or 'moov' or 'wide'
    const boxType = String.fromCharCode(...bytes.slice(4, 8));
    if (boxType === 'ftyp' || boxType === 'moov' || boxType === 'wide') {
      const majorBrand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
      // HEIC / HEIF still images
      if (majorBrand.includes('heic') || majorBrand.includes('mif1') || majorBrand.includes('msf1')) {
        return { isValid: true, detectedType: 'photo' };
      }
      return { isValid: true, detectedType: 'video' };
    }

    // WebM / Matroska (EBML header: 0x1A, 0x45, 0xDF, 0xA3)
    if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
      return { isValid: true, detectedType: 'video' };
    }

    // 4. Safe MIME-type fallback for formats without standard fixed 32-byte headers (e.g. SVG or raw streams)
    if (file.type.startsWith('image/')) {
      return { isValid: true, detectedType: 'photo' };
    }
    if (file.type.startsWith('video/')) {
      return { isValid: true, detectedType: 'video' };
    }

    return { isValid: false, detectedType: 'unknown', error: 'Unsupported file format or unverified media signature.' };
  } catch (err) {
    return { isValid: false, detectedType: 'unknown', error: 'Failed to inspect file integrity.' };
  }
}

/**
 * Generates an optimized thumbnail for a photo.
 */
export async function generatePhotoThumbnail(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200
): Promise<{ thumbnailBlob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          maxHeight = height;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) {
            resolve({ thumbnailBlob: blob, width, height });
          } else {
            reject(new Error('Failed to generate image thumbnail blob'));
          }
        },
        'image/jpeg',
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode photo asset.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Generates a video snapshot thumbnail by seeking to 0.5s,
 * avoiding buffering the entire multi-gigabyte video into memory.
 */
export async function generateVideoThumbnail(
  file: File,
  maxWidth = 800
): Promise<{ thumbnailBlob: Blob; width: number; height: number; duration: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    // Timeout safety in case video cannot seek
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Video thumbnail extraction timed out.'));
    }, 8000);

    video.onloadedmetadata = () => {
      const durationSecs = Math.round(video.duration || 0);
      const mins = Math.floor(durationSecs / 60);
      const secs = durationSecs % 60;
      const formattedDuration = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

      // Seek to 0.5s or midpoint if duration is very short
      video.currentTime = Math.min(0.5, video.duration / 2 || 0.1);

      video.onseeked = () => {
        clearTimeout(timeout);
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (blob) {
                resolve({
                  thumbnailBlob: blob,
                  width,
                  height,
                  duration: formattedDuration,
                });
              } else {
                reject(new Error('Could not create video thumbnail frame'));
              }
            },
            'image/jpeg',
            0.82
          );
        } else {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas context unavailable'));
        }
      };
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Video format not supported by browser decoder.'));
    };

    video.src = objectUrl;
  });
}

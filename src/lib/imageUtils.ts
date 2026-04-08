export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number;
}

export async function processImage(
  file: File,
  options: ResizeOptions = {}
): Promise<string> {
  const { maxWidth = 400, maxHeight = 400, quality = 0.8, maxSizeBytes } = options;

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid image type. Use PNG, JPEG, or WebP.');
  }

  const result = await resizeWithQuality(file, maxWidth, maxHeight, quality);

  if (maxSizeBytes && result.base64.length > maxSizeBytes) {
    let width = maxWidth;
    let height = maxHeight;
    let q = quality;
    
    while (q > 0.3) {
      q -= 0.1;
      const retry = await resizeWithQuality(file, width, height, q);
      if (retry.base64.length <= maxSizeBytes) {
        return retry.base64;
      }
    }
    
    const lastResort = await resizeWithQuality(file, Math.floor(width * 0.5), Math.floor(height * 0.5), 0.5);
    return lastResort.base64;
  }

  return result.base64;
}

interface ResizeResult {
  base64: string;
  width: number;
  height: number;
}

async function resizeWithQuality(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<ResizeResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64, width, height });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function resizeImage(
  file: File,
  options: ResizeOptions = {}
): Promise<string> {
  const { maxWidth = 400, maxHeight = 400, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const resizedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(resizedBase64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

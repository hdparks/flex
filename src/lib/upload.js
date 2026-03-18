import { UTApi, UTFile } from "uploadthing/server";

const MAX_IMAGE_SIZE = 500 * 1024;

const utapi = new UTApi();

export async function uploadImage(base64Data) {
  if (!base64Data) return null;

  const base64Match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid image format');
  }

  const mimeType = base64Match[1];
  const base64Payload = base64Match[2];
  const paddingCount = (base64Payload.match(/=/g) || []).length;
  const decodedLength = Math.floor((base64Payload.length * 3) / 4) - paddingCount;

  if (decodedLength > MAX_IMAGE_SIZE) {
    throw new Error('Image too large (max 500KB)');
  }

  const imageBuffer = Buffer.from(base64Payload, 'base64');

  const file = new UTFile([imageBuffer], `cheer-${Date.now()}.${mimeType}`, {
    type: `image/${mimeType}`,
  });

  const response = await utapi.uploadFiles(file);
  
  const result = Array.isArray(response) ? response[0] : response;

  if (!result || result.error) {
    const errMsg = result?.error?.message || 'Upload failed';
    throw new Error(errMsg);
  }

  return result.data?.url || null;
}

import { UTApi } from "uploadthing/server";

const MAX_IMAGE_SIZE = 500 * 1024;

const utapi = new UTApi();

export async function uploadImage(base64Data) {
  if (!base64Data) return null;

  const base64Match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid image format');
  }

  const mimeType = base64Match[1];
  const imageBuffer = Buffer.from(base64Match[2], 'base64');

  if (imageBuffer.length > MAX_IMAGE_SIZE) {
    throw new Error('Image too large (max 500KB)');
  }

  const file = new File([imageBuffer], `cheer-${Date.now()}.${mimeType}`, {
    type: `image/${mimeType}`,
  });

  const response = await utapi.uploadFiles(file);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data?.url || null;
}

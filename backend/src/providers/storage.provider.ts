import { randomUUID } from 'node:crypto';
import { logger } from '../config/logger';

export interface UploadedFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export interface StorageUploadResult {
  url: string;
  publicId: string;
}

export interface StorageProvider {
  upload(file: UploadedFile, folder: string): Promise<StorageUploadResult>;
}

/**
 * Dev-mode provider: does not actually persist the file anywhere; returns a
 * deterministic placeholder URL so document-upload flows are fully testable
 * without real Cloudinary credentials. Swap for a CloudinaryStorageProvider
 * in a later phase.
 */
class LocalStubStorageProvider implements StorageProvider {
  async upload(file: UploadedFile, folder: string): Promise<StorageUploadResult> {
    const publicId = `${folder}/${randomUUID()}`;
    logger.info('File "uploaded" (stub storage provider)', {
      folder,
      publicId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.buffer.length,
    });
    await Promise.resolve();
    return { url: `https://stub-storage.local/${publicId}`, publicId };
  }
}

export function createStorageProvider(): StorageProvider {
  return new LocalStubStorageProvider();
}

export const storageProvider = createStorageProvider();

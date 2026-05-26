import { randomUUID } from 'node:crypto';
import { logger } from '../../shared/logger.js';
import type { DriveClient, DriveFileMetadata, UploadFileInput } from './client.js';

export class MockDriveClient implements DriveClient {
  private readonly files = new Map<string, DriveFileMetadata>();

  async upload(input: UploadFileInput): Promise<DriveFileMetadata> {
    const fileId = `drv_${randomUUID().slice(0, 8)}`;
    const metadata: DriveFileMetadata = {
      file_id: fileId,
      name: input.name,
      mime_type: input.mime_type,
      ...(input.folder_id !== undefined && { folder_id: input.folder_id }),
      web_view_link: `https://drive.example.com/file/${fileId}`,
    };
    this.files.set(fileId, metadata);
    logger.info(
      {
        fileId,
        name: input.name,
        mimeType: input.mime_type,
      },
      'drive.mock.upload',
    );
    return metadata;
  }

  async getMetadata(fileId: string): Promise<DriveFileMetadata | null> {
    return this.files.get(fileId) ?? null;
  }

  async ping(): Promise<{ ok: true; provider: string }> {
    return { ok: true, provider: 'mock' };
  }
}

let cached: DriveClient | undefined;
export function getDriveClient(): DriveClient {
  if (!cached) cached = new MockDriveClient();
  return cached;
}
export function resetDriveClient(): void {
  cached = undefined;
}

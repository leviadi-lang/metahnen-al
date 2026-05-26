export interface DriveFileMetadata {
  file_id: string;
  name: string;
  mime_type: string;
  folder_id?: string;
  web_view_link?: string;
}

export interface UploadFileInput {
  name: string;
  mime_type: string;
  folder_id?: string;
  /** Base64-encoded content. */
  content_base64?: string;
  /** Optional source path (mock just records it). */
  source_path?: string;
}

export interface DriveClient {
  upload(input: UploadFileInput): Promise<DriveFileMetadata>;
  getMetadata(fileId: string): Promise<DriveFileMetadata | null>;
  ping(): Promise<{ ok: true; provider: string }>;
}

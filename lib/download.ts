import { writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { MediaType } from '@/types';

const TMP_DIR = tmpdir();
const DOWNLOAD_TIMEOUT_MS = 120_000; // 2 minutes
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB hard limit

export async function downloadMedia(
  url: string,
  mediaType: MediaType
): Promise<string> {
  const ext = mediaType === 'audio' ? 'mp3' : 'mp4';
  const filename = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const filePath = join(TMP_DIR, filename);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    throw new Error(`Download failed: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Download HTTP error: ${response.status} ${response.statusText}`);
  }

  // Stream body to buffer — check size limit during streaming
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is null');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.length;
    if (totalBytes > MAX_FILE_SIZE_BYTES) {
      await reader.cancel();
      throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
    }
    chunks.push(value);
  }

  const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));
  await mkdir(TMP_DIR, { recursive: true });
  await writeFile(filePath, buffer);
  return filePath;
}

import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import {
  detectImageType,
  MAX_PHOTO_BYTES,
  PHOTO_TOO_LARGE_MESSAGE,
  PHOTO_TYPE_MESSAGE,
  rpcError,
} from '@app/common';

export interface StoredPhoto {
  contentType: string;
  data: Buffer;
}

/** Local-disk photo store. Only this class touches the filesystem, so S3 could replace it. */
@Injectable()
export class PhotoStorageService {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('UPLOAD_DIR', './uploads'));
  }

  /** Returns the path relative to UPLOAD_DIR, which is what the database stores. */
  async save(photoBase64: string, workDate: string): Promise<string> {
    const data = Buffer.from(photoBase64, 'base64');
    if (data.length > MAX_PHOTO_BYTES) {
      throw rpcError(HttpStatus.PAYLOAD_TOO_LARGE, PHOTO_TOO_LARGE_MESSAGE);
    }
    const type = detectImageType(data);
    if (!type) throw rpcError(HttpStatus.UNSUPPORTED_MEDIA_TYPE, PHOTO_TYPE_MESSAGE);

    // Random name, extension from the bytes: nothing in the path comes from the client.
    const [year, month] = workDate.split('-');
    const relativePath = `attendance/${year}/${month}/${randomUUID()}.${type.extension}`;
    const fullPath = this.toFullPath(relativePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, data, { flag: 'wx' });
    return relativePath;
  }

  async read(relativePath: string): Promise<StoredPhoto> {
    let data: Buffer;
    try {
      data = await readFile(this.toFullPath(relativePath));
    } catch {
      throw rpcError(HttpStatus.NOT_FOUND, 'Foto absensi tidak ditemukan');
    }
    return { contentType: detectImageType(data)?.mimeType ?? 'application/octet-stream', data };
  }

  async remove(relativePath: string): Promise<void> {
    await rm(this.toFullPath(relativePath), { force: true });
  }

  private toFullPath(relativePath: string): string {
    const fullPath = resolve(this.root, relativePath);
    if (!fullPath.startsWith(this.root + sep)) {
      throw new Error(`Photo path escapes the upload directory: ${relativePath}`);
    }
    return fullPath;
  }
}

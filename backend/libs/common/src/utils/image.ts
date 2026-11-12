export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const PHOTO_TOO_LARGE_MESSAGE = 'Ukuran foto maksimal 2 MB';
export const PHOTO_TYPE_MESSAGE = 'Foto harus berupa gambar JPEG atau PNG';

export interface ImageType {
  mimeType: 'image/jpeg' | 'image/png';
  extension: 'jpg' | 'png';
}

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const startsWith = (data: Buffer, signature: number[]) =>
  data.length >= signature.length && signature.every((byte, index) => data[index] === byte);

/** Reads the file signature; the client's filename and Content-Type can be anything. */
export function detectImageType(data: Buffer): ImageType | null {
  if (startsWith(data, JPEG_SIGNATURE)) return { mimeType: 'image/jpeg', extension: 'jpg' };
  if (startsWith(data, PNG_SIGNATURE)) return { mimeType: 'image/png', extension: 'png' };
  return null;
}

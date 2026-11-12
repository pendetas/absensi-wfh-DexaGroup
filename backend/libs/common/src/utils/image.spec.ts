import { detectImageType } from './image';

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe('detectImageType', () => {
  it('recognises JPEG by its signature', () => {
    expect(detectImageType(Buffer.from([...JPEG_HEADER, 0x00, 0x10]))).toEqual({
      mimeType: 'image/jpeg',
      extension: 'jpg',
    });
  });

  it('recognises PNG by its signature', () => {
    expect(detectImageType(Buffer.from([...PNG_HEADER, 0x00]))).toEqual({
      mimeType: 'image/png',
      extension: 'png',
    });
  });

  it('rejects other content whatever the upload was named', () => {
    expect(detectImageType(Buffer.from('<?php echo 1; ?>'))).toBeNull();
    expect(detectImageType(Buffer.from('GIF89a'))).toBeNull();
    expect(detectImageType(Buffer.from('%PDF-1.7'))).toBeNull();
  });

  it('rejects empty and truncated files', () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
    expect(detectImageType(Buffer.from(PNG_HEADER.slice(0, 4)))).toBeNull();
  });
});

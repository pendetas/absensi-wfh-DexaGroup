const MAX_SIDE_PX = 1280;
const JPEG_QUALITY = 0.85;

/**
 * Takes the current video frame, scales it down, and writes `lines` onto a dark strip along
 * the bottom edge. The result is a JPEG of a few hundred kilobytes, well under the 2 MB limit.
 */
export function captureStampedPhoto(video: HTMLVideoElement, lines: string[]): Promise<Blob> {
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.round(video.videoWidth * scale);
  const height = Math.round(video.videoHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Canvas is not available'));
  context.drawImage(video, 0, 0, width, height);

  // Sized from the image width, so the stamp reads the same on a phone and a webcam.
  const fontSize = Math.max(13, Math.round(width / 38));
  const lineHeight = Math.round(fontSize * 1.4);
  const padding = Math.round(fontSize * 0.7);
  const stripHeight = lines.length * lineHeight + padding * 2;

  context.fillStyle = 'rgba(0, 0, 0, 0.62)';
  context.fillRect(0, height - stripHeight, width, stripHeight);
  context.fillStyle = '#ffffff';
  context.font = `600 ${fontSize}px "Open Sans Variable", system-ui, sans-serif`;
  context.textBaseline = 'middle';
  lines.forEach((line, index) => {
    const y = height - stripHeight + padding + lineHeight * (index + 0.5);
    context.fillText(line, padding, y, width - padding * 2);
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The photo could not be encoded'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

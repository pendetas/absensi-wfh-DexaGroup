import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { cn } from '../lib/cn';
import type { PhotoKind } from '../lib/types';
import { Skeleton } from './Feedback';

/** The endpoint needs the access token, which <img src> can't send, so it's fetched as a blob. */
export function AuthPhoto({
  attendanceId,
  kind,
  alt,
  fit = 'cover',
  className,
}: {
  attendanceId: number;
  kind: PhotoKind;
  alt: string;
  fit?: 'cover' | 'contain';
  /** Must fix the box size (width and aspect ratio), so the layout doesn't shift on load. */
  className?: string;
}) {
  const { data: blob, isError } = useQuery({
    queryKey: ['attendance-photo', attendanceId, kind],
    queryFn: () => api.blob(`/attendance/${attendanceId}/photos/${kind}`),
    staleTime: Infinity,
    retry: 1,
  });

  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (isError) {
    return (
      <div
        role="img"
        aria-label={`${alt} (gagal dimuat)`}
        className={cn(
          'flex items-center justify-center rounded bg-surface p-2 text-center text-xs text-ink-soft',
          className,
        )}
      >
        Foto gagal dimuat
      </div>
    );
  }
  if (!url) return <Skeleton className={className} />;
  return (
    <img
      src={url}
      alt={alt}
      // Thumbnails crop to fill; the full view shows the whole frame, stamp included.
      className={cn(
        'rounded',
        fit === 'cover' ? 'bg-surface object-cover' : 'bg-ink object-contain',
        className,
      )}
    />
  );
}

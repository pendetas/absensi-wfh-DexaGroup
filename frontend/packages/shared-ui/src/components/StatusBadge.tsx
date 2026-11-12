import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { formatDuration } from '../lib/format';
import type { Attendance, DailyStatus } from '../lib/types';

type Tone = 'ok' | 'warn' | 'muted' | 'strong' | 'outline';

const TONES: Record<Tone, string> = {
  ok: 'bg-ok-tint text-ok',
  warn: 'bg-warn-tint text-warn',
  muted: 'bg-line/70 text-ink-soft',
  // Solid ink, so the people HR still has to chase stand out from the tinted rows.
  strong: 'bg-ink text-white',
  // For a role, not a state: outlined so it never reads like a status to act on.
  outline: 'border border-ink text-ink',
};

/** A status in words on a tinted ground. The words carry it; the colour only speeds the scan. */
export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-block rounded px-2 py-0.5 text-[13px] font-semibold whitespace-nowrap',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

const STATUS_LABELS: Record<DailyStatus, { label: string; tone: Tone }> = {
  ON_TIME: { label: 'Tepat waktu', tone: 'ok' },
  LATE: { label: 'Terlambat', tone: 'warn' },
  OFF_DAY: { label: 'Hari libur', tone: 'muted' },
  NOT_CHECKED_IN: { label: 'Belum absen', tone: 'strong' },
};

export const statusLabel = (status: DailyStatus) => STATUS_LABELS[status].label;

/** "Terlambat 12 mnt" when the record says by how much. */
export function AttendanceStatusBadge({
  status,
  attendance,
}: {
  status: DailyStatus;
  attendance?: Pick<Attendance, 'lateMinutes'> | null;
}) {
  const { label, tone } = STATUS_LABELS[status];
  const late = status === 'LATE' && attendance ? ` ${formatDuration(attendance.lateMinutes)}` : '';
  return (
    <Badge tone={tone}>
      {label}
      {late}
    </Badge>
  );
}

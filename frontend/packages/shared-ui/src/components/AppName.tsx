import { cn } from '../lib/cn';

/** Type only: no logo was supplied, so none is drawn. */
export function AppName({
  appLabel,
  size = 'md',
  className,
}: {
  /** e.g. "HR" for the HR app. */
  appLabel?: string;
  size?: 'md' | 'lg';
  className?: string;
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-2.5 whitespace-nowrap',
        size === 'lg' ? 'text-lg' : 'text-[15px]',
        className,
      )}
    >
      <span className="font-extrabold tracking-tight text-brand">Dexa Group</span>
      <span aria-hidden="true" className="h-4 w-px bg-line-strong" />
      <span className="font-semibold text-ink">
        Absensi WFH
        {appLabel && <span className="ml-1.5 font-semibold text-ink-soft">{appLabel}</span>}
      </span>
    </p>
  );
}

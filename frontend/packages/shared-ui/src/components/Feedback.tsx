import type { ReactNode } from 'react';
import { ApiError } from '../lib/api';
import { cn } from '../lib/cn';
import { AppName } from './AppName';
import { Icon } from './Icon';

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="shrink-0 animate-spin"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity=".25"
      />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

/** Shaped like the app shell, so the restored page appears in place rather than after a spinner. */
export function PageLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex min-h-dvh flex-col">
      <div className="border-b border-line bg-paper">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <AppName className="max-sm:text-sm" />
          <Skeleton className="hidden h-4 w-64 sm:block" />
          <div className="ml-auto flex flex-col items-end gap-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="mt-2 h-40 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  );
}

/** Sized like the content it replaces, so nothing jumps; reduced motion stops the sweep. */
export function Skeleton({
  className,
  onBrand = false,
}: {
  className?: string;
  /** For placeholders on the red band. */
  onBrand?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-shimmer rounded bg-[length:200%_100%]',
        onBrand
          ? 'bg-[linear-gradient(90deg,rgb(255_255_255/0.16)_30%,rgb(255_255_255/0.32)_50%,rgb(255_255_255/0.16)_70%)]'
          : 'bg-[linear-gradient(90deg,var(--color-line)_30%,#ececea_50%,var(--color-line)_70%)]',
        className,
      )}
    />
  );
}

/** Wraps a page's placeholder: announced once to screen readers, hidden from them otherwise. */
export function SkeletonScreen({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className={className}>
      {children}
    </div>
  );
}

type Tone = 'error' | 'warn' | 'ok' | 'neutral';

const TONES: Record<Tone, string> = {
  error: 'border-brand bg-brand-tint text-brand-strong',
  warn: 'border-warn bg-warn-tint text-warn',
  ok: 'border-ok bg-ok-tint text-ok',
  neutral: 'border-line-strong bg-paper text-ink',
};

/** Inline message. Errors are announced immediately; the rest wait for a pause. */
export function Alert({
  tone = 'error',
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-2.5 rounded-md border px-3 py-2.5 text-sm', TONES[tone])}
    >
      <span className="mt-0.5">
        <Icon name={tone === 'ok' ? 'check' : 'alert'} />
      </span>
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

/** What went wrong, in the server's words when it gave any. */
export function errorMessages(error: unknown): string[] {
  if (error instanceof ApiError) return error.messages;
  return ['Terjadi kesalahan yang tidak terduga. Coba lagi.'];
}

export function ErrorAlert({ error }: { error: unknown }) {
  const messages = errorMessages(error);
  return (
    <Alert>
      {messages.length === 1 ? (
        messages[0]
      ) : (
        <ul className="list-disc pl-4">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </Alert>
  );
}

/** Fills the place of a list that is empty or failed to load, with the next step to take. */
export function StateMessage({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 px-4 py-8 sm:items-center sm:text-center">
      <p className="font-semibold">{title}</p>
      {children && <p className="max-w-prose text-sm text-ink-soft">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '../lib/cn';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Feedback';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';
type Size = 'md' | 'lg';

const BASE =
  'group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-md ' +
  'font-semibold whitespace-nowrap transition duration-200 ease-out-soft ' +
  'active:translate-y-px active:scale-[.985] disabled:opacity-55 ' +
  'disabled:active:translate-y-0 disabled:active:scale-100';

const VARIANTS: Record<Variant, string> = {
  // Lifts and darkens: the one button on a screen that invites a press.
  primary:
    'bg-brand text-white hover:-translate-y-px hover:bg-brand-strong ' +
    'hover:shadow-[0_8px_18px_rgb(125_29_25/0.28)] disabled:hover:translate-y-0 disabled:hover:shadow-none',
  // A red tint wipes in from the left, so a secondary action still answers the pointer.
  secondary:
    'border border-line-strong bg-paper text-ink hover:border-brand hover:text-brand-strong ' +
    'before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 ' +
    'before:bg-brand-tint before:transition-transform before:duration-300 before:ease-out-soft ' +
    'hover:before:scale-x-100 disabled:hover:before:scale-x-0',
  quiet: 'text-ink hover:bg-line/60',
  danger: 'border border-brand bg-paper text-brand hover:bg-brand hover:text-white',
};

// 44px high everywhere: these apps are used with a thumb as often as with a mouse.
const SIZES: Record<Size, string> = {
  md: 'min-h-11 px-4 text-[15px]',
  lg: 'min-h-14 px-6 text-base',
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  block?: boolean;
}

const classes = ({ variant = 'secondary', size = 'md', block }: StyleProps, extra?: string) =>
  cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', extra);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  /** Shows a spinner and blocks a second click while a request is running. */
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  icon,
  block,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes({ variant, size, block }, className)}
      {...rest}
    >
      {loading ? <Spinner /> : icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

/** Navigation that looks like a button. It stays a link, so it opens in a new tab on request. */
export function ButtonLink({
  variant,
  size,
  icon,
  block,
  className,
  children,
  ...rest
}: LinkProps & StyleProps) {
  return (
    <Link className={classes({ variant, size, block }, className)} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </Link>
  );
}

/** Square button for an icon alone; `label` is what a screen reader announces. */
export function IconButton({
  icon,
  label,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink',
        'hover:bg-line/60 active:translate-y-px disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

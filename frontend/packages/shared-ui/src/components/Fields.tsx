import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import { Icon } from './Icon';

const CONTROL =
  'w-full rounded-md border border-line-strong bg-paper px-3 text-[15px] text-ink ' +
  // A red edge and soft red halo show which field is being typed in.
  'transition duration-200 ease-out-soft hover:border-ink-soft ' +
  'focus:border-brand focus:ring-4 focus:ring-brand-tint focus:outline-none ' +
  // Full-strength grey: placeholders here carry real hints ("nama@dexa.test atau EMP001").
  'placeholder:text-ink-soft disabled:bg-surface disabled:text-ink-soft ' +
  'aria-[invalid=true]:border-brand';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Hides the label visually (it stays for screen readers), e.g. a search box in a toolbar. */
  hideLabel?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label above, control, then either the error or the hint below. */
function FieldShell({ id, label, hint, error, hideLabel, className, children }: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-sm font-semibold', hideLabel && 'sr-only')}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-note`} className="flex items-start gap-1.5 text-sm text-brand-strong">
          <span className="mt-0.5">
            <Icon name="alert" size={15} />
          </span>
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-note`} className="text-sm text-ink-soft">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

interface CommonProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  hideLabel?: boolean;
  wrapperClassName?: string;
}

const describedBy = (id: string, hint: ReactNode, error?: string) =>
  hint || error ? `${id}-note` : undefined;

export function TextField({
  label,
  hint,
  error,
  hideLabel,
  wrapperClassName,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & CommonProps) {
  const id = useId();
  return (
    <FieldShell {...{ id, label, hint, error, hideLabel }} className={wrapperClassName}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(CONTROL, 'h-11', className)}
        {...rest}
      />
    </FieldShell>
  );
}

/** Password input with a show/hide switch, so a mistyped password can be checked. */
export function PasswordField({
  label,
  hint,
  error,
  wrapperClassName,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & CommonProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell {...{ id, label, hint, error }} className={wrapperClassName}>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(CONTROL, 'h-11 pr-12')}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-ink-soft hover:text-ink"
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={20} />
        </button>
      </div>
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  hideLabel,
  wrapperClassName,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & CommonProps) {
  const id = useId();
  return (
    <FieldShell {...{ id, label, hint, error, hideLabel }} className={wrapperClassName}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(CONTROL, 'h-11 pr-8', className)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  wrapperClassName,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & CommonProps) {
  const id = useId();
  return (
    <FieldShell {...{ id, label, hint, error }} className={wrapperClassName}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(CONTROL, 'py-2.5', className)}
        {...rest}
      />
    </FieldShell>
  );
}

export function Checkbox({
  label,
  hint,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div>
      {/* The whole row is the label, so the tap target is the full width and 44px tall. */}
      <label htmlFor={id} className="flex min-h-11 items-center gap-3 text-[15px]">
        <input
          id={id}
          type="checkbox"
          aria-describedby={hint ? `${id}-note` : undefined}
          className="size-5 shrink-0 accent-brand"
          {...rest}
        />
        {label}
      </label>
      {hint && (
        <p id={`${id}-note`} className="pl-8 text-sm text-ink-soft">
          {hint}
        </p>
      )}
    </div>
  );
}

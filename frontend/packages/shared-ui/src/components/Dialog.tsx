import { type ReactNode, useEffect, useId, useRef } from 'react';
import { cn } from '../lib/cn';
import { gsap } from '../lib/motion';
import { IconButton } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Buttons, right-aligned on wide screens and stacked on a phone. */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Takes the whole screen on a phone, for the camera and for photo-heavy detail views. */
  fullScreenOnPhone?: boolean;
  /** Full-height panel from the right on wide screens, so HR can read it next to the list. */
  drawer?: boolean;
}

const WIDTHS = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' };

/** Native <dialog>: the browser traps focus, closes on Escape and returns focus to the opener. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  fullScreenOnPhone = false,
  drawer = false,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const wide = window.matchMedia('(min-width: 640px)').matches;
      gsap.fromTo(
        dialog,
        drawer && wide
          ? { xPercent: 100 }
          : wide
            ? { y: 16, opacity: 0 }
            : { yPercent: 30, opacity: 0 },
        { xPercent: 0, y: 0, yPercent: 0, opacity: 1, duration: 0.4, ease: 'power3.out' },
      );
    }
    if (!open && dialog.open) dialog.close();
  }, [open, drawer]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself, never on its content.
      onClick={(event) => event.target === ref.current && onClose()}
      className={cn(
        'w-full max-w-none bg-paper p-0 text-ink shadow-xl',
        drawer
          ? 'sm:mt-0 sm:mr-0 sm:mb-0 sm:ml-auto sm:h-dvh sm:max-h-none'
          : cn('m-auto sm:rounded-lg', WIDTHS[size]),
        drawer && 'm-auto sm:max-w-2xl',
        fullScreenOnPhone ? 'max-sm:h-dvh max-sm:max-h-none' : 'max-sm:mb-0 max-sm:rounded-t-lg',
      )}
    >
      {open && (
        <div
          className={cn(
            'flex max-h-dvh flex-col',
            drawer ? 'sm:h-dvh' : 'sm:max-h-[90dvh]',
            // Fills the phone screen so the footer buttons sit at the bottom, under the thumb.
            fullScreenOnPhone && 'max-sm:h-dvh',
          )}
        >
          <header className="flex items-center justify-between gap-3 border-b border-line py-2 pr-2 pl-4">
            <h2 id={titleId} className="text-base font-bold">
              {title}
            </h2>
            <IconButton icon="close" label="Tutup" onClick={onClose} />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-line p-4 sm:flex-row sm:justify-end">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}

import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Icon } from './Icon';

const VISIBLE_MS = 5000;

const ToastContext = createContext<(message: string) => void>(() => {});

/** Confirms an action that just succeeded: `const notify = useToast(); notify('Tersimpan')`. */
export const useToast = () => useContext(ToastContext);

/** One message at a time, shown above the phone's bottom navigation and read out politely. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const notify = useCallback((next: string) => {
    window.clearTimeout(timer.current);
    setMessage(next);
    timer.current = window.setTimeout(() => setMessage(null), VISIBLE_MS);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-6"
      >
        {message && (
          <p className="flex max-w-md items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lg">
            <Icon name="check" />
            {message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}

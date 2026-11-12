import type { ReactNode } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { ErrorAlert } from './Feedback';

/** Asks before an action that affects someone else's account, and shows why it failed. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  loading,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  /** What will happen, in a sentence or two. */
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  loading: boolean;
  error?: unknown;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error != null && <ErrorAlert error={error} />}
        <div className="text-[15px]">{children}</div>
      </div>
    </Dialog>
  );
}

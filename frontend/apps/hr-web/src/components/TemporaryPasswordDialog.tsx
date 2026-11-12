import { useEffect, useState } from 'react';
import { Alert, Button, Dialog } from '@dexa/shared-ui';

export interface IssuedPassword {
  employeeName: string;
  employeeCode: string;
  temporaryPassword: string;
}

/** The only moment a temporary password is visible: the server keeps just its hash. */
export function TemporaryPasswordDialog({
  issued,
  onClose,
}: {
  issued: IssuedPassword | null;
  onClose: () => void;
}) {
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => setCopy('idle'), [issued]);
  const copied = copy === 'copied';

  async function copyPassword() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.temporaryPassword);
      setCopy('copied');
    } catch {
      // Browsers refuse clipboard access outside HTTPS or without permission.
      setCopy('failed');
    }
  }

  return (
    <Dialog
      open={issued !== null}
      onClose={onClose}
      title="Password sementara"
      size="sm"
      footer={
        <Button variant="primary" onClick={onClose}>
          Sudah saya catat
        </Button>
      }
    >
      {issued && (
        <div className="flex flex-col gap-3">
          <p>
            Berikan password ini kepada <span className="font-semibold">{issued.employeeName}</span>{' '}
            ({issued.employeeCode}). Saat pertama masuk, karyawan wajib menggantinya.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border border-line-strong bg-surface px-3 py-2.5 font-mono text-lg font-semibold tracking-wider select-all">
              {issued.temporaryPassword}
            </code>
            <Button icon={copied ? 'check' : 'copy'} onClick={() => void copyPassword()}>
              {copied ? 'Tersalin' : 'Salin'}
            </Button>
          </div>
          {copy === 'failed' && (
            <Alert tone="error">
              Browser tidak mengizinkan penyalinan otomatis. Pilih password di atas lalu salin
              secara manual.
            </Alert>
          )}
          <Alert tone="warn">
            Password ini tidak akan ditampilkan lagi. Jika hilang, gunakan Reset password.
          </Alert>
        </div>
      )}
    </Dialog>
  );
}

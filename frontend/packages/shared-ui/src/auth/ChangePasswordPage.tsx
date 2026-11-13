import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, ButtonLink } from '../components/Button';
import { ErrorAlert } from '../components/Feedback';
import { PasswordField } from '../components/Fields';
import { useToast } from '../components/Toast';
import { useAuth } from './AuthProvider';

const MIN_LENGTH = 8;
const meetsPolicy = (password: string) =>
  password.length >= MIN_LENGTH && /[A-Za-z]/.test(password) && /\d/.test(password);

/** `forced`: first login with a temporary password; nothing else is reachable until it changes. */
export function ChangePasswordPage({ forced = false }: { forced?: boolean }) {
  const { changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const notify = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextError = !meetsPolicy(next)
    ? 'Minimal 8 karakter, dengan huruf dan angka.'
    : next === current
      ? 'Password baru harus berbeda dari yang sekarang.'
      : undefined;
  const confirmError = confirm !== next ? 'Tidak sama dengan password baru.' : undefined;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    if (current === '' || nextError || confirmError) return;

    setError(null);
    setSubmitting(true);
    try {
      await changePassword(current, next);
      notify('Password berhasil diganti');
      void navigate('/', { replace: true });
    } catch (caught) {
      setError(caught);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm py-6">
      <h1 className="text-xl font-bold">{forced ? 'Buat password baru' : 'Ganti password'}</h1>
      <p className="mt-1 text-ink-soft">
        {forced
          ? 'Password dari HR hanya berlaku untuk masuk pertama kali. Ganti sekarang untuk melanjutkan.'
          : 'Setelah diganti, perangkat lain yang sedang masuk dengan akun ini akan keluar.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
        {error !== null && <ErrorAlert error={error} />}
        <PasswordField
          label={forced ? 'Password sementara dari HR' : 'Password sekarang'}
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          autoComplete="current-password"
          error={showErrors && current === '' ? 'Wajib diisi.' : undefined}
        />
        <PasswordField
          label="Password baru"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          autoComplete="new-password"
          hint="Minimal 8 karakter, dengan huruf dan angka."
          error={showErrors ? nextError : undefined}
        />
        <PasswordField
          label="Ulangi password baru"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          error={showErrors ? confirmError : undefined}
        />
        <Button type="submit" variant="primary" block loading={submitting}>
          Simpan password baru
        </Button>
        {forced ? (
          <Button variant="quiet" block onClick={() => void logout()}>
            Keluar
          </Button>
        ) : (
          <ButtonLink to="/akun" variant="quiet" block>
            Batal
          </ButtonLink>
        )}
      </form>
    </div>
  );
}

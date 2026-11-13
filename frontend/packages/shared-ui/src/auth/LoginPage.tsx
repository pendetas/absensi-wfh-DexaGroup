import { type FormEvent, useState } from 'react';
import { Button } from '../components/Button';
import { AppName } from '../components/AppName';
import { ErrorAlert } from '../components/Feedback';
import { Checkbox, PasswordField, TextField } from '../components/Fields';
import { useAuth } from './AuthProvider';

/** Rendered in place of the page, so a deep link survives the login. */
export function LoginPage({ appLabel, intro }: { appLabel?: string; intro: string }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier.trim(), password, rememberDevice);
    } catch (caught) {
      setError(caught);
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <AppName appLabel={appLabel} size="lg" />
      <h1 className="mt-6 text-2xl font-bold">Masuk</h1>
      <p className="mt-1 text-ink-soft">{intro}</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        {error !== null && <ErrorAlert error={error} />}
        <TextField
          label="Email atau NIK"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="nama@dexa.test atau EMP001"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
        <Checkbox
          label="Percayai perangkat ini selama 7 hari"
          hint="Jangan centang di komputer bersama."
          checked={rememberDevice}
          onChange={(event) => setRememberDevice(event.target.checked)}
        />
        <Button
          type="submit"
          variant="primary"
          block
          loading={submitting}
          disabled={identifier.trim() === '' || password === ''}
        >
          Masuk
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        Lupa password? Hubungi HR untuk mendapatkan password sementara.
      </p>
    </main>
  );
}

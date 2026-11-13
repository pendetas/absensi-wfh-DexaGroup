import { type ReactNode, useState } from 'react';
import { PageHeader, Panel } from '../components/AppShell';
import { Button, ButtonLink } from '../components/Button';
import { formatDate } from '../lib/format';
import { useAuth, useCurrentUser } from './AuthProvider';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line px-4 py-3 last:border-b-0 sm:flex-row sm:gap-4">
      <dt className="text-sm text-ink-soft sm:w-40 sm:shrink-0">{label}</dt>
      <dd className="min-w-0 font-semibold break-words">{children}</dd>
    </div>
  );
}

/** The profile is read-only: HR owns that data. */
export function AccountPage({ otherApp }: { otherApp?: { label: string; href: string } }) {
  const { logout } = useAuth();
  const { user, employee } = useCurrentUser();
  const [loggingOut, setLoggingOut] = useState(false);

  return (
    <>
      <PageHeader
        title="Akun"
        description="Data ini dikelola HR. Hubungi HR jika ada yang perlu diperbaiki."
      />
      <Panel>
        <dl>
          <Row label="Nama">{employee.fullName}</Row>
          <Row label="NIK">{employee.employeeCode}</Row>
          <Row label="Email">{user.email}</Row>
          <Row label="Departemen">{employee.department.name}</Row>
          <Row label="Jabatan">{employee.position}</Row>
          <Row label="Tanggal bergabung">{formatDate(employee.joinDate)}</Row>
        </dl>
      </Panel>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <ButtonLink to="/ganti-password">Ganti password</ButtonLink>
        {otherApp && (
          // A different app on another origin, so a plain link rather than a router link.
          <a
            href={otherApp.href}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line-strong bg-paper px-4 font-semibold hover:bg-surface"
          >
            {otherApp.label}
          </a>
        )}
        <Button
          variant="danger"
          icon="logout"
          loading={loggingOut}
          onClick={() => {
            setLoggingOut(true);
            void logout();
          }}
          className="sm:ml-auto"
        >
          Keluar
        </Button>
      </div>
    </>
  );
}

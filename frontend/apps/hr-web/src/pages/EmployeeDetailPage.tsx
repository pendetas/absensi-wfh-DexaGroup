import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  api,
  ApiError,
  type AttendanceHistory,
  Badge,
  Button,
  ConfirmDialog,
  type EmployeeInput,
  type EmployeeWithAccount,
  errorMessages,
  formatDate,
  formatDateTime,
  Icon,
  MONTH_PAGE_SIZE,
  MonthHistory,
  Panel,
  Skeleton,
  SkeletonScreen,
  StateMessage,
  useCurrentUser,
  useToast,
} from '@dexa/shared-ui';
import { EmployeeFormDialog } from '../components/EmployeeFormDialog';
import {
  type IssuedPassword,
  TemporaryPasswordDialog,
} from '../components/TemporaryPasswordDialog';
import { ACCOUNT_STATUS } from '../lib/employees';

type Action = 'edit' | 'reset' | 'role' | 'deactivate' | 'reactivate';
type WithPassword = { employee?: EmployeeWithAccount; temporaryPassword: string };

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-line px-4 py-3 sm:border-r sm:[&:nth-child(2n)]:border-r-0">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="font-semibold break-words">{children}</dd>
    </div>
  );
}

export function EmployeeDetailPage() {
  const id = Number(useParams().id);
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const notify = useToast();
  const [action, setAction] = useState<Action | null>(null);
  const [issued, setIssued] = useState<IssuedPassword | null>(null);

  const {
    data: employee,
    error,
    isPending,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.get<EmployeeWithAccount>(`/employees/${id}`),
    enabled: Number.isInteger(id),
  });

  /** One mutation for every action on this employee; each ends by refreshing what changed. */
  const mutation = useMutation({
    mutationFn: async (request: { action: Action; input?: EmployeeInput }) => {
      const base = `/employees/${id}`;
      switch (request.action) {
        case 'edit':
          await api.patch(base, request.input);
          return null;
        case 'role':
          await api.patch(`${base}/role`, {
            role: employee?.account?.role === 'HR_ADMIN' ? 'EMPLOYEE' : 'HR_ADMIN',
          });
          return null;
        case 'deactivate':
          await api.post(`${base}/deactivate`);
          return null;
        case 'reactivate':
          return api.post<WithPassword>(`${base}/reactivate`);
        case 'reset':
          return api.post<WithPassword>(`${base}/reset-password`);
      }
    },
    onSuccess: async (result, request) => {
      setAction(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employee', id] }),
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['monitoring'] }),
      ]);
      if (result && employee) {
        setIssued({
          employeeName: employee.fullName,
          employeeCode: employee.employeeCode,
          temporaryPassword: result.temporaryPassword,
        });
      } else {
        notify(
          {
            edit: 'Data karyawan disimpan',
            role: 'Hak akses diubah',
            deactivate: 'Karyawan dinonaktifkan',
            reactivate: '',
            reset: '',
          }[request.action],
        );
      }
    },
  });

  function open(next: Action) {
    mutation.reset();
    setAction(next);
  }
  const close = () => setAction(null);
  const run = (next: Action) => () => mutation.mutate({ action: next });

  const backLink = (
    <Link
      to="/karyawan"
      className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink sm:min-h-0"
    >
      <Icon name="chevronLeft" size={16} />
      Semua karyawan
    </Link>
  );

  if (isPending) {
    return (
      <SkeletonScreen label="Memuat data karyawan" className="flex flex-col gap-4">
        <Skeleton className="h-4 w-32" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Skeleton className="h-7 w-56" />
            <Skeleton className="mt-2 h-4 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-11 w-28 rounded-md" />
            <Skeleton className="h-11 w-32 rounded-md" />
          </div>
        </div>
        <div className="grid overflow-hidden rounded-lg border border-line bg-paper sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((fact) => (
            <div key={fact} className="border-b border-line px-4 py-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-4 w-40" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-2 h-5 w-36" />
        <Skeleton className="h-48 rounded-lg" />
      </SkeletonScreen>
    );
  }
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <>
        {backLink}
        <Panel>
          <StateMessage
            title={notFound ? 'Karyawan tidak ditemukan' : 'Data karyawan gagal dimuat'}
            action={
              !notFound && (
                <Button icon="refresh" loading={isFetching} onClick={() => void refetch()}>
                  Coba lagi
                </Button>
              )
            }
          >
            {notFound
              ? 'Karyawan ini tidak ada. Periksa kembali dari daftar karyawan.'
              : errorMessages(error)[0]}
          </StateMessage>
        </Panel>
      </>
    );
  }

  const { account } = employee;
  const isSelf = employee.id === user.employeeId;
  const isHr = account?.role === 'HR_ADMIN';
  const status = account ? ACCOUNT_STATUS[account.status] : null;

  return (
    <>
      {backLink}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{employee.fullName}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <span className="tabular-nums">{employee.employeeCode}</span>
            {status && <Badge tone={status.tone}>{status.label}</Badge>}
            {isHr && <Badge tone="outline">Admin HR</Badge>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => open('edit')}>Ubah data</Button>
          {/* The server refuses these on your own account, so there is always an HR admin left. */}
          {!isSelf && employee.isActive && (
            <>
              <Button onClick={() => open('reset')}>Reset password</Button>
              <Button onClick={() => open('role')}>
                {isHr ? 'Cabut akses HR' : 'Jadikan admin HR'}
              </Button>
              <Button variant="danger" onClick={() => open('deactivate')}>
                Nonaktifkan
              </Button>
            </>
          )}
          {!employee.isActive && (
            <Button variant="primary" onClick={() => open('reactivate')}>
              Aktifkan kembali
            </Button>
          )}
        </div>
      </div>
      {isSelf && (
        <p className="mb-4 text-sm text-ink-soft">
          Ini akun Anda sendiri. Reset password, hak akses, dan penonaktifan hanya bisa dilakukan
          oleh admin HR lain.
        </p>
      )}

      <Panel className="mb-6 overflow-hidden">
        <dl className="-mb-px grid sm:grid-cols-2">
          <Fact label="Email">{employee.email}</Fact>
          <Fact label="Nomor HP">{employee.phone ?? 'Belum diisi'}</Fact>
          <Fact label="Departemen">{employee.department.name}</Fact>
          <Fact label="Jabatan">{employee.position}</Fact>
          <Fact label="Tanggal bergabung">{formatDate(employee.joinDate)}</Fact>
          <Fact label="Terakhir masuk">
            {account?.lastLoginAt ? `${formatDateTime(account.lastLoginAt)} WIB` : 'Belum pernah'}
          </Fact>
        </dl>
      </Panel>

      <h2 className="mb-2 text-lg font-bold">Riwayat absensi</h2>
      <MonthHistory
        scope={['employee', id]}
        employeeName={`${employee.fullName} (${employee.employeeCode})`}
        earliestDate={employee.joinDate}
        fetchMonth={(range) =>
          api.get<AttendanceHistory>(`/attendance/employees/${id}`, {
            ...range,
            limit: MONTH_PAGE_SIZE,
          })
        }
      />

      <EmployeeFormDialog
        open={action === 'edit'}
        employee={employee}
        submitting={mutation.isPending}
        error={mutation.error}
        onSubmit={(input) => mutation.mutate({ action: 'edit', input })}
        onClose={close}
      />
      <ConfirmDialog
        open={action === 'reset'}
        title="Reset password"
        confirmLabel="Reset password"
        loading={mutation.isPending}
        error={mutation.error}
        onConfirm={run('reset')}
        onClose={close}
      >
        {employee.fullName} akan keluar dari semua perangkat dan mendapat password sementara baru.
        Password lamanya tidak bisa dipakai lagi.
      </ConfirmDialog>
      <ConfirmDialog
        open={action === 'role'}
        title={isHr ? 'Cabut akses HR' : 'Jadikan admin HR'}
        confirmLabel={isHr ? 'Cabut akses HR' : 'Jadikan admin HR'}
        loading={mutation.isPending}
        error={mutation.error}
        onConfirm={run('role')}
        onClose={close}
      >
        {isHr
          ? `${employee.fullName} tidak akan bisa lagi membuka aplikasi HR. Absensinya sendiri tidak terpengaruh.`
          : `${employee.fullName} akan bisa melihat absensi semua karyawan dan mengelola data karyawan.`}{' '}
        Ia perlu masuk ulang agar perubahan berlaku.
      </ConfirmDialog>
      <ConfirmDialog
        open={action === 'deactivate'}
        title="Nonaktifkan karyawan"
        confirmLabel="Nonaktifkan"
        danger
        loading={mutation.isPending}
        error={mutation.error}
        onConfirm={run('deactivate')}
        onClose={close}
      >
        {employee.fullName} tidak akan bisa masuk atau absen lagi. Riwayat absensinya tetap
        tersimpan, dan akunnya bisa diaktifkan kembali kapan saja.
      </ConfirmDialog>
      <ConfirmDialog
        open={action === 'reactivate'}
        title="Aktifkan kembali"
        confirmLabel="Aktifkan kembali"
        loading={mutation.isPending}
        error={mutation.error}
        onConfirm={run('reactivate')}
        onClose={close}
      >
        {employee.fullName} akan bisa masuk lagi dengan password sementara baru.
      </ConfirmDialog>
      <TemporaryPasswordDialog issued={issued} onClose={() => setIssued(null)} />
    </>
  );
}

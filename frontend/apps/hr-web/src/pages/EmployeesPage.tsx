import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  api,
  Badge,
  Button,
  type EmployeeInput,
  type EmployeeWithAccount,
  errorMessages,
  PageHeader,
  type Paginated,
  Pagination,
  Panel,
  SelectField,
  Skeleton,
  SkeletonScreen,
  StateMessage,
  TextField,
  useDebouncedValue,
} from '@dexa/shared-ui';
import { EmployeeFormDialog } from '../components/EmployeeFormDialog';
import {
  type IssuedPassword,
  TemporaryPasswordDialog,
} from '../components/TemporaryPasswordDialog';
import { DepartmentSelect } from '../components/DepartmentSelect';
import { ACCOUNT_STATUS } from '../lib/employees';

const PAGE_SIZE = 20;
const COLUMNS =
  'md:grid-cols-[5.5rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(9rem,auto)]';

function AccountBadges({ employee }: { employee: EmployeeWithAccount }) {
  const status = employee.account ? ACCOUNT_STATUS[employee.account.status] : null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {status && <Badge tone={status.tone}>{status.label}</Badge>}
      {employee.account?.role === 'HR_ADMIN' && <Badge tone="outline">Admin HR</Badge>}
    </span>
  );
}

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [issued, setIssued] = useState<IssuedPassword | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim());

  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['employees', debouncedSearch, departmentId, status, page],
    queryFn: () =>
      api.get<Paginated<EmployeeWithAccount>>('/employees', {
        search: debouncedSearch,
        departmentId,
        status,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const create = useMutation({
    mutationFn: (input: EmployeeInput) =>
      api.post<{ employee: EmployeeWithAccount; temporaryPassword: string }>('/employees', input),
    onSuccess: ({ employee, temporaryPassword }) => {
      setAdding(false);
      setIssued({
        employeeName: employee.fullName,
        employeeCode: employee.employeeCode,
        temporaryPassword,
      });
      return queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  function change(setter: (value: string) => void) {
    return (event: { target: { value: string } }) => {
      setter(event.target.value);
      setPage(1);
    };
  }
  const filtered = debouncedSearch !== '' || departmentId !== '' || status !== 'active';

  return (
    <>
      <PageHeader
        title="Karyawan"
        description={data ? `${data.meta.total} karyawan sesuai saringan` : undefined}
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => {
              create.reset();
              setAdding(true);
            }}
          >
            Tambah karyawan
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <TextField
          label="Cari karyawan"
          hideLabel
          type="search"
          placeholder="Cari nama, NIK, atau email"
          value={search}
          onChange={change(setSearch)}
          wrapperClassName="sm:w-72"
        />
        <DepartmentSelect
          label="Departemen"
          hideLabel
          allLabel="Semua departemen"
          value={departmentId}
          onChange={change(setDepartmentId)}
          wrapperClassName="sm:w-56"
        />
        <SelectField
          label="Status karyawan"
          hideLabel
          value={status}
          onChange={change(setStatus)}
          wrapperClassName="sm:w-44"
        >
          <option value="active">Karyawan aktif</option>
          <option value="inactive">Nonaktif</option>
          <option value="all">Semua status</option>
        </SelectField>
      </div>

      <Panel>
        {isPending ? (
          <SkeletonScreen label="Memuat daftar karyawan">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div
                key={row}
                className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3.5 last:border-b-0 ${COLUMNS}`}
              >
                <Skeleton className="order-2 h-4 w-16 md:order-none" />
                <div className="order-1 md:order-none">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="mt-2 h-3 w-28" />
                </div>
                <Skeleton className="order-3 col-span-2 h-4 w-28 md:order-none md:col-span-1" />
                <Skeleton className="hidden h-4 w-32 md:block" />
                <Skeleton className="order-4 h-5 w-20 rounded md:order-none" />
              </div>
            ))}
          </SkeletonScreen>
        ) : error ? (
          <StateMessage
            title="Daftar karyawan gagal dimuat"
            action={
              <Button icon="refresh" loading={isFetching} onClick={() => void refetch()}>
                Coba lagi
              </Button>
            }
          >
            {errorMessages(error)[0]}
          </StateMessage>
        ) : data.data.length === 0 ? (
          <StateMessage title={filtered ? 'Tidak ada karyawan yang cocok' : 'Belum ada karyawan'}>
            {filtered
              ? 'Ubah kata pencarian, departemen, atau status.'
              : 'Tambahkan karyawan pertama dengan tombol Tambah karyawan.'}
          </StateMessage>
        ) : (
          <>
            <div
              aria-hidden="true"
              className={`hidden gap-x-3 border-b border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-soft md:grid ${COLUMNS}`}
            >
              <span>NIK</span>
              <span>Nama</span>
              <span>Departemen</span>
              <span>Jabatan</span>
              <span>Akun</span>
            </div>
            <ul aria-label="Daftar karyawan">
              {data.data.map((employee) => (
                <li key={employee.id} className="border-b border-line last:border-b-0">
                  <Link
                    to={`/karyawan/${employee.id}`}
                    className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 group px-4 py-3 transition-colors duration-200 hover:bg-brand-wash active:bg-brand-tint ${COLUMNS}`}
                  >
                    <span className="order-2 text-sm text-ink-soft tabular-nums md:order-none md:text-[15px] md:text-ink">
                      {employee.employeeCode}
                    </span>
                    <span className="order-1 min-w-0 md:order-none">
                      <span className="block truncate font-semibold">
                        <span className="bg-[linear-gradient(var(--color-brand),var(--color-brand))] bg-[length:0_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 ease-out-soft group-hover:bg-[length:100%_2px]">
                          {employee.fullName}
                        </span>
                      </span>
                      <span className="block truncate text-sm text-ink-soft">{employee.email}</span>
                    </span>
                    <span className="order-3 col-span-2 truncate text-sm md:order-none md:col-span-1 md:text-[15px]">
                      {employee.department.name}
                      <span className="md:hidden">, {employee.position}</span>
                    </span>
                    <span className="hidden truncate md:block">{employee.position}</span>
                    <span className="order-4 col-span-2 md:order-none md:col-span-1">
                      <AccountBadges employee={employee} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {data && (
        <Pagination
          page={data.meta.page}
          limit={data.meta.limit}
          total={data.meta.total}
          onPageChange={setPage}
        />
      )}

      <EmployeeFormDialog
        open={adding}
        submitting={create.isPending}
        error={create.error}
        onSubmit={create.mutate}
        onClose={() => setAdding(false)}
      />
      <TemporaryPasswordDialog issued={issued} onClose={() => setIssued(null)} />
    </>
  );
}

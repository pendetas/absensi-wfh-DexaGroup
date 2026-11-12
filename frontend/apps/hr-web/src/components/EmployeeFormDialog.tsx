import { type FormEvent, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  type EmployeeInput,
  type EmployeeWithAccount,
  ErrorAlert,
  type Role,
  SelectField,
  TextField,
  todayInJakarta,
} from '@dexa/shared-ui';
import { DepartmentSelect } from './DepartmentSelect';

interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  departmentId: string;
  position: string;
  joinDate: string;
  role: Role;
}

const emptyValues = (): FormValues => ({
  fullName: '',
  email: '',
  phone: '',
  departmentId: '',
  position: '',
  joinDate: todayInJakarta(),
  role: 'EMPLOYEE',
});

const REQUIRED = 'Wajib diisi.';

/**
 * Only checks that nothing is blank. The format rules (phone, email, name length) live on the
 * server, which answers with a specific message for each field it rejects.
 */
function validate(values: FormValues): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  for (const field of ['fullName', 'email', 'phone', 'position', 'joinDate'] as const) {
    if (values[field].trim() === '') errors[field] = REQUIRED;
  }
  if (values.departmentId === '') errors.departmentId = 'Pilih departemen.';
  return errors;
}

/** Add (no `employee`) or edit. Role is only chosen on add; later it has its own action. */
export function EmployeeFormDialog({
  open,
  employee,
  submitting,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  employee?: EmployeeWithAccount;
  submitting: boolean;
  error: unknown;
  onSubmit: (input: EmployeeInput) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [showErrors, setShowErrors] = useState(false);
  const isEdit = employee !== undefined;

  useEffect(() => {
    if (!open) return;
    setShowErrors(false);
    setValues(
      employee
        ? {
            fullName: employee.fullName,
            email: employee.email,
            phone: employee.phone ?? '',
            departmentId: String(employee.departmentId),
            position: employee.position,
            joinDate: employee.joinDate,
            role: employee.account?.role ?? 'EMPLOYEE',
          }
        : emptyValues(),
    );
  }, [open, employee]);

  const errors = showErrors ? validate(values) : {};
  const field = (name: keyof FormValues) => ({
    value: values[name],
    error: errors[name],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [name]: event.target.value })),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(validate(values)).length > 0) return;
    onSubmit({
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      departmentId: Number(values.departmentId),
      position: values.position.trim(),
      joinDate: values.joinDate,
      ...(isEdit ? {} : { role: values.role }),
    });
  }

  const formId = 'employee-form';
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Ubah data karyawan' : 'Tambah karyawan'}
      fullScreenOnPhone
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={submitting}>
            {isEdit ? 'Simpan perubahan' : 'Tambah karyawan'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error != null && <ErrorAlert error={error} />}
        <TextField label="Nama lengkap" autoComplete="off" {...field('fullName')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Email kerja"
            type="email"
            autoComplete="off"
            hint={
              isEdit ? 'Mengubah email juga mengubah email untuk masuk.' : 'Dipakai untuk masuk.'
            }
            {...field('email')}
          />
          <TextField
            label="Nomor HP"
            type="tel"
            autoComplete="off"
            hint="Contoh: 0812-3456-7890"
            {...field('phone')}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <DepartmentSelect label="Departemen" {...field('departmentId')} />
          <TextField label="Jabatan" autoComplete="off" {...field('position')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Tanggal bergabung"
            type="date"
            hint="Karyawan baru bisa absen mulai tanggal ini."
            {...field('joinDate')}
          />
          {!isEdit && (
            <SelectField label="Hak akses" {...field('role')}>
              <option value="EMPLOYEE">Karyawan</option>
              <option value="HR_ADMIN">Admin HR</option>
            </SelectField>
          )}
        </div>
        {!isEdit && (
          <p className="text-sm text-ink-soft">
            NIK dan password sementara dibuat otomatis setelah karyawan ditambahkan.
          </p>
        )}
      </form>
    </Dialog>
  );
}

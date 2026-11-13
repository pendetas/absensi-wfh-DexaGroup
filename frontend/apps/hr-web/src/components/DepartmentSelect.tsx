import type { ChangeEvent } from 'react';
import { Button, SelectField } from '@dexa/shared-ui';
import { useDepartments } from '../lib/employees';

/** On a load failure, shows an error with retry instead of an empty dropdown. */
export function DepartmentSelect({
  label,
  hideLabel,
  value,
  onChange,
  allLabel,
  error,
  wrapperClassName,
}: {
  label: string;
  hideLabel?: boolean;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  /** Adds a first option for "no filter", e.g. "Semua departemen". */
  allLabel?: string;
  error?: string;
  wrapperClassName?: string;
}) {
  const departments = useDepartments();

  if (departments.isError) {
    return (
      <div className={wrapperClassName}>
        <SelectField
          label={label}
          hideLabel={hideLabel}
          value=""
          disabled
          error="Daftar departemen gagal dimuat."
        >
          <option value="">Departemen tidak tersedia</option>
        </SelectField>
        <Button
          icon="refresh"
          loading={departments.isFetching}
          onClick={() => void departments.refetch()}
          className="mt-2"
        >
          Muat ulang departemen
        </Button>
      </div>
    );
  }

  return (
    <SelectField
      label={label}
      hideLabel={hideLabel}
      value={value}
      onChange={onChange}
      error={error}
      wrapperClassName={wrapperClassName}
    >
      {allLabel ? (
        <option value="">{allLabel}</option>
      ) : (
        <option value="" disabled>
          {departments.isPending ? 'Memuat departemen' : 'Pilih departemen'}
        </option>
      )}
      {departments.data?.map((department) => (
        <option key={department.id} value={department.id}>
          {department.name}
        </option>
      ))}
    </SelectField>
  );
}

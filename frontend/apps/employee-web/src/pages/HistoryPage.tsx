import {
  api,
  type AttendanceHistory,
  MonthHistory,
  PageHeader,
  useCurrentUser,
} from '@dexa/shared-ui';

// A month never has more than 31 records, so one page always holds it.
const MONTH_PAGE_SIZE = 31;

export function HistoryPage() {
  const { employee } = useCurrentUser();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Riwayat absensi" description="Pilih satu hari untuk melihat fotonya." />
      <MonthHistory
        scope={['me']}
        employeeName={employee.fullName}
        earliestDate={employee.joinDate}
        fetchMonth={(range) =>
          api.get<AttendanceHistory>('/attendance/me', { ...range, limit: MONTH_PAGE_SIZE })
        }
      />
    </div>
  );
}

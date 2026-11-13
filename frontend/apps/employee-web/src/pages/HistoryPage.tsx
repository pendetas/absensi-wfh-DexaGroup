import {
  api,
  type AttendanceHistory,
  MONTH_PAGE_SIZE,
  MonthHistory,
  PageHeader,
  useCurrentUser,
} from '@dexa/shared-ui';

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

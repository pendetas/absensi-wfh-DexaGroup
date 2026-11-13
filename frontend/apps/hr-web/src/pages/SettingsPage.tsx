import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useState } from 'react';
import {
  api,
  type AttendanceSettings,
  Button,
  ErrorAlert,
  errorMessages,
  formatDateTime,
  formatDuration,
  formatWorkStart,
  PageHeader,
  Panel,
  SelectField,
  Skeleton,
  SkeletonScreen,
  StateMessage,
  TextField,
  useToast,
} from '@dexa/shared-ui';

/** 4 to 12 hours in half-hour steps covers part-time to long shifts. */
const TARGET_OPTIONS = Array.from({ length: 17 }, (_, index) => 240 + index * 30);

export function SettingsPage() {
  const queryClient = useQueryClient();
  const notify = useToast();
  const [workStartTime, setWorkStartTime] = useState('');
  const [dailyWorkMinutes, setDailyWorkMinutes] = useState(480);

  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['attendance-settings'],
    queryFn: () => api.get<AttendanceSettings>('/attendance/settings'),
  });
  useEffect(() => {
    if (!data) return;
    setWorkStartTime(data.workStartTime);
    setDailyWorkMinutes(data.dailyWorkMinutes);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api.put<AttendanceSettings>('/attendance/settings', { workStartTime, dailyWorkMinutes }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['attendance-settings'], saved);
      notify(
        `Tersimpan: jam masuk ${formatWorkStart(saved.workStartTime)}, target ${formatDuration(saved.dailyWorkMinutes)} per hari`,
      );
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  const unchanged =
    data !== undefined &&
    workStartTime === data.workStartTime &&
    dailyWorkMinutes === data.dailyWorkMinutes;

  return (
    <div className="max-w-xl">
      <PageHeader title="Pengaturan" description="Berlaku untuk semua karyawan." />
      <Panel className="p-4">
        {isPending ? (
          <SkeletonScreen label="Memuat pengaturan" className="flex flex-col gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-11 w-44 rounded-md" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="mt-2 h-4 w-44" />
            <Skeleton className="h-11 w-44 rounded-md" />
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="mt-1 h-11 w-40 rounded-md" />
          </SkeletonScreen>
        ) : error ? (
          <StateMessage
            title="Pengaturan gagal dimuat"
            action={
              <Button icon="refresh" loading={isFetching} onClick={() => void refetch()}>
                Coba lagi
              </Button>
            }
          >
            {errorMessages(error)[0]}
          </StateMessage>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {save.error && <ErrorAlert error={save.error} />}

            <div className="flex flex-col gap-2">
              <TextField
                label="Jam masuk kerja (WIB)"
                type="time"
                required
                value={workStartTime}
                onChange={(event) => setWorkStartTime(event.target.value)}
                wrapperClassName="w-44"
              />
              <ul className="list-disc pl-5 text-sm text-ink-soft">
                <li>
                  Check-in setelah jam ini tercatat terlambat. Tidak ada toleransi waktu: atur jam
                  ini jika perlu kelonggaran.
                </li>
                <li>
                  Perubahan berlaku mulai check-in berikutnya. Absensi yang sudah ada tidak berubah.
                </li>
                <li>Sabtu dan Minggu tidak dihitung sebagai hari kerja.</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 border-t border-line pt-5">
              <SelectField
                label="Target jam kerja per hari"
                value={dailyWorkMinutes}
                onChange={(event) => setDailyWorkMinutes(Number(event.target.value))}
                wrapperClassName="w-44"
              >
                {TARGET_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {formatDuration(minutes)}
                  </option>
                ))}
              </SelectField>
              <p className="text-sm text-ink-soft">
                Dihitung dari check-in sampai check-out. Karyawan melihat jam kerjanya dibanding
                target ini di halaman utama, dan HR melihat siapa yang belum mencapainya.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" loading={save.isPending} disabled={unchanged}>
                Simpan pengaturan
              </Button>
              <p className="text-sm text-ink-soft">
                Terakhir diubah {formatDateTime(data.updatedAt)} WIB
              </p>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}

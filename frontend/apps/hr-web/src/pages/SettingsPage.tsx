import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useState } from 'react';
import {
  api,
  type AttendanceSettings,
  Button,
  ErrorAlert,
  errorMessages,
  formatDateTime,
  formatWorkStart,
  PageHeader,
  Panel,
  Skeleton,
  SkeletonScreen,
  StateMessage,
  TextField,
  useToast,
} from '@dexa/shared-ui';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const notify = useToast();
  const [workStartTime, setWorkStartTime] = useState('');

  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['attendance-settings'],
    queryFn: () => api.get<AttendanceSettings>('/attendance/settings'),
  });
  useEffect(() => {
    if (data) setWorkStartTime(data.workStartTime);
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.put<AttendanceSettings>('/attendance/settings', { workStartTime }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['attendance-settings'], saved);
      notify(`Jam masuk diubah menjadi ${formatWorkStart(saved.workStartTime)}`);
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

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
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {save.error && <ErrorAlert error={save.error} />}
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
                Check-in setelah jam ini tercatat terlambat. Tidak ada toleransi waktu: atur jam ini
                jika perlu kelonggaran.
              </li>
              <li>
                Perubahan berlaku mulai check-in berikutnya. Absensi yang sudah ada tidak berubah.
              </li>
              <li>Sabtu dan Minggu tidak dihitung sebagai hari kerja.</li>
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                variant="primary"
                loading={save.isPending}
                disabled={workStartTime === '' || workStartTime === data.workStartTime}
              >
                Simpan jam masuk
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

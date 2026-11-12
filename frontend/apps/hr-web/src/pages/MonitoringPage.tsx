import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  addDays,
  api,
  AttendanceDetailDialog,
  type AttendanceSettings,
  Button,
  type DailyMonitoring,
  type DailyRow,
  errorMessages,
  formatDate,
  formatLongDate,
  formatTime,
  gsap,
  IconButton,
  MOTION,
  PageHeader,
  Pagination,
  Panel,
  ScrollTrigger,
  SkeletonScreen,
  StateMessage,
  TextField,
  todayInJakarta,
  useDebouncedValue,
  useGSAP,
} from '@dexa/shared-ui';
import { DepartmentSelect } from '../components/DepartmentSelect';
import { ArrivalChart } from '../components/monitoring/ArrivalChart';
import { MonitoringRow, ROW_GRID } from '../components/monitoring/MonitoringRow';
import { RowsSkeleton, SummarySkeleton } from '../components/monitoring/MonitoringSkeleton';
import {
  filterOptions,
  type StatusFilter,
  StatusTiles,
} from '../components/monitoring/StatusTiles';

const PAGE_SIZE = 20;
const REFRESH_MS = 60_000;
const HEADER_HEIGHT = 56;

/**
 * Once the tiles scroll under the header, a slim copy of them follows HR down the list, so
 * the counts and filters stay one click away.
 */
function useFollowingSummary() {
  const summaryRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    // A passive scroll check: one layout read per scroll event, and it answers immediately.
    const check = () => {
      const summary = summaryRef.current;
      if (summary) setFollowing(summary.getBoundingClientRect().bottom < HEADER_HEIGHT);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  useGSAP(
    () => {
      gsap.to(barRef.current, {
        yPercent: following ? 0 : -120,
        autoAlpha: following ? 1 : 0,
        duration: 0.35,
        ease: MOTION.ease,
      });
    },
    { dependencies: [following] },
  );

  return { summaryRef, barRef, following };
}

/** HR's home: everyone expected on a date, who is missing, and the proof for those present. */
export function MonitoringPage() {
  const today = todayInJakarta();
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DailyRow | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debouncedSearch = useDebouncedValue(search.trim());
  const isToday = date === today;
  const follow = useFollowingSummary();

  const { data, error, isPending, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['monitoring', date, status, debouncedSearch, departmentId, page],
    queryFn: () =>
      api.get<DailyMonitoring>('/attendance/monitoring', {
        date,
        status: status === 'ALL' ? undefined : status,
        search: debouncedSearch,
        departmentId,
        page,
        limit: PAGE_SIZE,
      }),
    // Keeps the previous list on screen while the next one loads, instead of flashing empty.
    placeholderData: keepPreviousData,
    // Check-ins arrive through the morning; past days no longer change.
    refetchInterval: isToday ? REFRESH_MS : false,
  });

  // Rows recorded before today keep the start time they were judged by; this is for the rest.
  const settings = useQuery({
    queryKey: ['attendance-settings'],
    queryFn: () => api.get<AttendanceSettings>('/attendance/settings'),
  });
  const workStartTime = data?.isWorkingDay
    ? (data.data.find((row) => row.attendance?.workStartTime)?.attendance?.workStartTime ??
      settings.data?.workStartTime ??
      null)
    : null;

  // Rows enter as they scroll into view; only a new set of rows animates, not a refresh.
  const rowsKey = data?.data.map((row) => row.employee.id).join() ?? '';
  useGSAP(
    () => {
      if (!rowsKey) return;
      gsap.set('[data-mrow]', { opacity: 0, y: 14 });
      gsap.set('[data-track-bar]', { scaleX: 0 });
      ScrollTrigger.batch('[data-mrow]', {
        start: 'top 95%',
        once: true,
        onEnter: (rows) => {
          gsap.to(rows, {
            opacity: 1,
            y: 0,
            duration: MOTION.enter,
            stagger: MOTION.stagger,
            ease: MOTION.ease,
          });
          gsap.to(
            rows.flatMap((row) => [...row.querySelectorAll('[data-track-bar]')]),
            { scaleX: 1, duration: 0.7, stagger: MOTION.stagger, delay: 0.1, ease: 'power2.out' },
          );
        },
      });
    },
    { scope: listRef, dependencies: [rowsKey] },
  );

  /** Any change of filter starts again from the first page. */
  function change<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }
  const changeStatus = change(setStatus);
  const changeDate = change((next: string) => {
    setDate(next);
    setStatus('ALL');
  });
  const filtered = debouncedSearch !== '' || departmentId !== '';
  const options = data ? filterOptions(data) : [];

  return (
    <>
      {/* Height 0 and sticky under the header: holds the following summary bar. */}
      <div className="sticky top-14 z-20 -mx-4 h-0">
        <div
          ref={follow.barRef}
          aria-hidden={!follow.following}
          className="invisible flex items-center gap-2 overflow-x-auto border-b border-line bg-paper/95 px-4 py-2 opacity-0 shadow-[0_6px_18px_rgb(28_28_30/0.08)] backdrop-blur-sm"
        >
          <span className="mr-1 shrink-0 text-sm font-bold">{formatDate(date)}</span>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              tabIndex={follow.following ? 0 : -1}
              aria-pressed={status === option.value}
              onClick={() => changeStatus(option.value)}
              className={
                status === option.value
                  ? 'min-h-9 shrink-0 rounded-md border border-ink bg-ink px-3 text-sm font-semibold text-white'
                  : 'min-h-9 shrink-0 rounded-md border border-line-strong bg-paper px-3 text-sm font-semibold hover:bg-surface active:bg-line'
              }
            >
              {option.label} {option.count}
            </button>
          ))}
        </div>
      </div>

      <PageHeader
        title="Absensi"
        description={
          data && !data.isWorkingDay
            ? `${formatLongDate(date)}, bukan hari kerja`
            : formatLongDate(date)
        }
        actions={
          <div className="flex items-center gap-2">
            {dataUpdatedAt > 0 && (
              <p className="text-sm text-ink-soft" role="status">
                Diperbarui {formatTime(new Date(dataUpdatedAt))}
              </p>
            )}
            <Button icon="refresh" loading={isFetching} onClick={() => void refetch()}>
              Muat ulang
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <IconButton
            icon="chevronLeft"
            label="Hari sebelumnya"
            onClick={() => changeDate(addDays(date, -1))}
          />
          <TextField
            label="Tanggal"
            hideLabel
            type="date"
            value={date}
            max={today}
            onChange={(event) => event.target.value && changeDate(event.target.value)}
            wrapperClassName="w-44"
          />
          <IconButton
            icon="chevronRight"
            label="Hari berikutnya"
            disabled={isToday}
            onClick={() => changeDate(addDays(date, 1))}
          />
          {!isToday && <Button onClick={() => changeDate(today)}>Hari ini</Button>}
        </div>

        <div ref={follow.summaryRef} className="flex flex-col gap-3">
          {isPending ? (
            <SkeletonScreen label="Memuat ringkasan absensi" className="flex flex-col gap-3">
              <SummarySkeleton />
            </SkeletonScreen>
          ) : (
            data && (
              <>
                <StatusTiles options={options} active={status} onChange={changeStatus} />
                <ArrivalChart
                  arrivals={data.arrivals}
                  workStartTime={workStartTime}
                  notCheckedIn={data.isWorkingDay ? data.summary.notCheckedIn : null}
                  animateKey={data.date}
                  highlightedId={highlightedId}
                  onHighlight={setHighlightedId}
                  onPick={(arrival) => {
                    setSearch(arrival.employeeCode);
                    changeStatus('ALL');
                  }}
                  onShowMissing={() => changeStatus('NOT_CHECKED_IN')}
                />
              </>
            )
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <TextField
            label="Cari karyawan"
            hideLabel
            type="search"
            placeholder="Cari nama, NIK, atau email"
            value={search}
            onChange={(event) => change(setSearch)(event.target.value)}
            wrapperClassName="sm:w-72"
          />
          <DepartmentSelect
            label="Departemen"
            hideLabel
            allLabel="Semua departemen"
            value={departmentId}
            onChange={(event) => change(setDepartmentId)(event.target.value)}
            wrapperClassName="sm:w-56"
          />
        </div>
        {filtered && (
          <p className="text-sm text-ink-soft">
            Angka dan grafik di atas menghitung seluruh karyawan, bukan hasil pencarian.
          </p>
        )}
      </div>

      <Panel className="overflow-hidden">
        {isPending ? (
          <SkeletonScreen label="Memuat daftar absensi">
            <RowsSkeleton />
          </SkeletonScreen>
        ) : error ? (
          <StateMessage
            title="Data absensi gagal dimuat"
            action={
              <Button icon="refresh" loading={isFetching} onClick={() => void refetch()}>
                Coba lagi
              </Button>
            }
          >
            {errorMessages(error)[0]}
          </StateMessage>
        ) : data.data.length === 0 ? (
          <StateMessage
            title={
              filtered || status !== 'ALL'
                ? 'Tidak ada karyawan yang cocok'
                : data.isWorkingDay
                  ? 'Belum ada karyawan pada tanggal ini'
                  : 'Tidak ada yang check-in pada hari libur ini'
            }
          >
            {filtered || status !== 'ALL'
              ? 'Ubah kata pencarian, departemen, atau status untuk melihat karyawan lain.'
              : data.isWorkingDay
                ? 'Tidak ada karyawan aktif yang sudah bergabung pada tanggal ini.'
                : 'Pada hari libur, hanya karyawan yang check-in yang ditampilkan.'}
          </StateMessage>
        ) : (
          <>
            {/* Column labels for wide screens; on a phone each line is self-explanatory. */}
            <div
              aria-hidden="true"
              className={`hidden ${ROW_GRID} gap-x-4 border-b border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-soft md:grid`}
            >
              <span>Foto</span>
              <span>Karyawan</span>
              <span>07.00 sampai 19.00</span>
              <span>Jam, lokasi, catatan</span>
              <span>Status</span>
            </div>
            <ul ref={listRef} aria-label={`Absensi ${formatLongDate(date)}`}>
              {data.data.map((row) => (
                <MonitoringRow
                  key={row.employee.id}
                  row={row}
                  workStartTime={workStartTime}
                  isToday={isToday}
                  highlighted={highlightedId === row.employee.id}
                  onHighlight={setHighlightedId}
                  onOpen={setSelected}
                />
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

      <AttendanceDetailDialog
        attendance={selected?.attendance ?? null}
        employeeName={
          selected ? `${selected.employee.fullName} (${selected.employee.employeeCode})` : ''
        }
        onClose={() => setSelected(null)}
      />
    </>
  );
}

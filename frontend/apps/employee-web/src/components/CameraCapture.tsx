import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  api,
  type Attendance,
  Button,
  describeLocation,
  Dialog,
  ErrorAlert,
  formatDateTime,
  formatTime,
  Icon,
  locationPrecision,
  type PlaceResult,
  Spinner,
  StateMessage,
  TextAreaField,
  useCurrentUser,
  useToast,
} from '@dexa/shared-ui';
import { type LocationState, useLocation } from '../lib/hooks';
import { captureStampedPhoto } from '../lib/photo';

export type CaptureMode = 'check-in' | 'check-out';

const LABELS = {
  'check-in': { title: 'Foto check-in', action: 'Kirim check-in', stamp: 'Check-in' },
  'check-out': { title: 'Foto check-out', action: 'Kirim check-out', stamp: 'Check-out' },
};

const NOTE_MAX_LENGTH = 255;

type BlockReason = 'denied' | 'missing' | 'busy' | 'unsupported';

const BLOCKED: Record<BlockReason, { title: string; body: string; canRetry: boolean }> = {
  denied: {
    title: 'Kamera belum diizinkan',
    body: 'Izinkan akses kamera untuk situs ini di pengaturan browser, lalu coba lagi. Foto dari galeri tidak bisa dipakai sebagai bukti.',
    canRetry: true,
  },
  missing: {
    title: 'Kamera tidak ditemukan',
    body: 'Buka halaman ini di perangkat yang memiliki kamera, misalnya ponsel.',
    canRetry: true,
  },
  busy: {
    title: 'Kamera sedang dipakai aplikasi lain',
    body: 'Tutup aplikasi atau tab lain yang memakai kamera, lalu coba lagi.',
    canRetry: true,
  },
  unsupported: {
    title: 'Browser ini tidak bisa membuka kamera',
    body: 'Buka halaman ini lewat HTTPS dengan browser versi terbaru.',
    canRetry: false,
  },
};

function toBlockReason(error: unknown): BlockReason {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'missing';
  return 'busy';
}

type Phase =
  | { step: 'starting' }
  | { step: 'live' }
  | { step: 'blocked'; reason: BlockReason }
  | { step: 'preview'; photo: Blob; url: string };

/** Readable place name for the device position, as resolved by the backend. */
function usePlace(state: LocationState) {
  // An IP-based guess has no place worth naming; the server would say so anyway.
  const location =
    state.status === 'ready' && locationPrecision(state.location) !== 'unknown'
      ? state.location
      : null;
  return useQuery({
    // About 100 m: moving within the same street doesn't ask again.
    queryKey: ['place', location?.latitude.toFixed(3), location?.longitude.toFixed(3)],
    queryFn: () =>
      api.get<PlaceResult>('/attendance/place', {
        latitude: location!.latitude,
        longitude: location!.longitude,
        accuracy: location!.accuracyMeters ?? undefined,
      }),
    enabled: location !== null,
    staleTime: Infinity,
    retry: false,
  });
}

function LocationNote({
  state,
  place,
  placePending,
  onRetry,
}: {
  state: LocationState;
  place: string | null;
  placePending: boolean;
  onRetry: () => void;
}) {
  let text: string;
  let canRetry = false;
  if (state.status === 'pending') text = 'Mencari lokasi Anda';
  else if (state.status === 'denied')
    text =
      'Lokasi tidak dibagikan. Izinkan lokasi untuk situs ini di pengaturan browser jika ingin menyertakannya. Absensi tetap bisa dikirim.';
  else if (state.status === 'unavailable' && state.reason === 'unsupported')
    text = 'Browser ini tidak bisa membagikan lokasi. Absensi tetap bisa dikirim.';
  else if (state.status === 'unavailable') {
    text = 'Browser belum berhasil mendapatkan lokasi. Absensi tetap bisa dikirim.';
    canRetry = true;
  } else if (locationPrecision(state.location) === 'unknown') {
    text = 'Browser hanya bisa menebak lokasi dari koneksi internet. Absensi tetap bisa dikirim.';
    canRetry = true;
  } else if (placePending) text = 'Lokasi ditemukan, mencari nama tempat';
  else text = `Lokasi: ${describeLocation(state.location, place)}`;

  const busy = state.status === 'pending' || (state.status === 'ready' && placePending);
  return (
    <div className="flex items-start gap-2 text-sm text-ink-soft">
      <span className="mt-0.5">{busy ? <Spinner size={16} /> : <Icon name="pin" size={16} />}</span>
      <p>
        {text}
        {canRetry && (
          <>
            {' '}
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-2 hover:text-brand sm:min-h-0"
            >
              Coba lagi
            </button>
          </>
        )}
      </p>
    </div>
  );
}

interface CameraCaptureProps {
  /** null keeps the dialog closed and the camera off. */
  mode: CaptureMode | null;
  /** Server time, for the stamp on the photo. */
  now: () => Date;
  onClose: () => void;
}

/** Live camera only: there is no file input, so a photo can't come from the gallery. */
export function CameraCapture({ mode, now, onClose }: CameraCaptureProps) {
  const open = mode !== null;
  const { employee } = useCurrentUser();
  const queryClient = useQueryClient();
  const notify = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>({ step: 'starting' });
  const [videoReady, setVideoReady] = useState(false);
  const [note, setNote] = useState('');
  const location = useLocation(open);
  const placeQuery = usePlace(location);
  const placeNote = (
    <LocationNote
      state={location}
      place={placeQuery.data?.place ?? null}
      placePending={location.status === 'ready' && placeQuery.isLoading}
      onRetry={location.retry}
    />
  );

  // Bumped on every stop or restart, so a late permission answer can't leave the camera on.
  const cameraRequest = useRef(0);

  const stopCamera = useCallback(() => {
    cameraRequest.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setVideoReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    const request = cameraRequest.current;
    setPhase({ step: 'starting' });
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase({ step: 'blocked', reason: 'unsupported' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (request !== cameraRequest.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setPhase({ step: 'live' });
    } catch (error) {
      if (request === cameraRequest.current) {
        setPhase({ step: 'blocked', reason: toBlockReason(error) });
      }
    }
  }, [stopCamera]);

  // The <video> only exists in the live step, so the stream is attached once it has rendered.
  useEffect(() => {
    if (phase.step === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [phase.step]);

  useEffect(() => {
    if (phase.step !== 'preview') return;
    return () => URL.revokeObjectURL(phase.url);
  }, [phase]);

  const submit = useMutation({
    mutationFn: (photo: Blob) => {
      const form = new FormData();
      form.append('photo', photo, `${mode}.jpg`);
      if (note.trim()) form.append('note', note.trim());
      if (location.status === 'ready') {
        form.append('latitude', String(location.location.latitude));
        form.append('longitude', String(location.location.longitude));
        if (location.location.accuracyMeters !== null) {
          form.append('accuracy', String(location.location.accuracyMeters));
        }
      }
      return api.upload<Attendance>(`/attendance/${mode}`, form);
    },
    onSuccess: (attendance) => {
      const time = formatTime(mode === 'check-in' ? attendance.checkInAt : attendance.checkOutAt!);
      notify(`${LABELS[mode!].stamp} tercatat pukul ${time}`);
      onClose();
    },
    // On failure too: a 409 means the record changed elsewhere, e.g. on another device.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attendance-today'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance-history'] }),
      ]),
  });
  const resetSubmit = submit.reset;

  useEffect(() => {
    if (!open) return;
    setNote('');
    resetSubmit();
    void startCamera();
    return stopCamera;
  }, [open, startCamera, stopCamera, resetSubmit]);

  async function takePhoto() {
    const video = videoRef.current;
    if (!video || !mode) return;
    const lines = [
      `${employee.fullName} (${employee.employeeCode})`,
      `${LABELS[mode].stamp}, ${formatDateTime(now())} WIB`,
    ];
    // A place name people can read; coordinates would mean nothing on the photo.
    if (location.status === 'ready' && placeQuery.data?.place) {
      lines.push(describeLocation(location.location, placeQuery.data.place));
    }
    const photo = await captureStampedPhoto(video, lines);
    stopCamera();
    setPhase({ step: 'preview', photo, url: URL.createObjectURL(photo) });
  }

  function retake() {
    resetSubmit();
    void startCamera();
  }

  const labels = mode ? LABELS[mode] : LABELS['check-in'];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={labels.title}
      size="md"
      fullScreenOnPhone
      footer={
        phase.step === 'live' ? (
          // Keyed so React doesn't reuse this button's element for "Ulangi foto" below.
          <Button
            key="capture"
            variant="primary"
            size="lg"
            icon="camera"
            block
            disabled={!videoReady}
            onClick={() => void takePhoto()}
          >
            Ambil foto
          </Button>
        ) : phase.step === 'preview' ? (
          <>
            <Button key="retake" onClick={retake} disabled={submit.isPending}>
              Ulangi foto
            </Button>
            <Button
              key="send"
              variant="primary"
              loading={submit.isPending}
              onClick={() => submit.mutate(phase.photo)}
            >
              {labels.action}
            </Button>
          </>
        ) : undefined
      }
    >
      {phase.step === 'starting' && (
        <p
          role="status"
          className="flex aspect-[4/3] items-center justify-center gap-3 text-ink-soft"
        >
          <Spinner />
          Membuka kamera
        </p>
      )}

      {phase.step === 'blocked' && (
        <StateMessage
          title={BLOCKED[phase.reason].title}
          action={
            BLOCKED[phase.reason].canRetry && (
              <Button icon="refresh" onClick={() => void startCamera()}>
                Coba lagi
              </Button>
            )
          }
        >
          {BLOCKED[phase.reason].body}
        </StateMessage>
      )}

      {phase.step === 'live' && (
        <div className="flex flex-col gap-3">
          {/* Mirrored while framing only; the saved photo is not mirrored. */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setVideoReady(true)}
            aria-label="Pratinjau kamera"
            className="aspect-[4/3] w-full -scale-x-100 rounded bg-ink object-cover"
          />
          <p className="text-sm text-ink-soft">
            Pastikan wajah dan tempat kerja Anda terlihat jelas. Nama, NIK, dan waktu akan
            dicantumkan pada foto.
          </p>
          {placeNote}
        </div>
      )}

      {phase.step === 'preview' && (
        <div className="flex flex-col gap-3">
          {submit.error && <ErrorAlert error={submit.error} />}
          <img
            src={phase.url}
            alt="Foto yang akan dikirim"
            className="aspect-[4/3] w-full rounded bg-ink object-contain"
          />
          {placeNote}
          <TextAreaField
            label="Catatan (opsional)"
            rows={2}
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            hint={`Contoh: listrik padam sejak pagi. ${note.length}/${NOTE_MAX_LENGTH} karakter.`}
          />
          <p className="text-sm text-ink-soft">
            Waktu absensi dicatat oleh server saat foto dikirim, bukan saat foto diambil.
          </p>
        </div>
      )}
    </Dialog>
  );
}

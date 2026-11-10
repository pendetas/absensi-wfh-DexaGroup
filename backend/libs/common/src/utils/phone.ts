/** Indonesian mobile in E.164: +62 8xx, 10 to 13 digits in local 08xx form. */
export const INDONESIAN_MOBILE_PATTERN = /^\+628\d{8,11}$/;

/** Accepts 08xx, 628xx or +628xx with spaces, dashes or dots and returns +628xx. */
export function normalizeIndonesianPhone(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const compact = value.replace(/[\s\-().]/g, '');
  if (compact === '') return undefined;
  if (compact.startsWith('+62')) return compact;
  if (compact.startsWith('62')) return `+${compact}`;
  if (compact.startsWith('0')) return `+62${compact.slice(1)}`;
  return compact;
}

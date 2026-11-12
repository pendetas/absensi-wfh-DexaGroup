const PREFIX = 'EMP';
const MIN_DIGITS = 3;

/** EMP001 … EMP999, then EMP1000: the padding is a minimum width, not a limit. */
export function nextEmployeeCode(lastCode: string | null): string {
  const next = lastCode ? Number(lastCode.slice(PREFIX.length)) + 1 : 1;
  return `${PREFIX}${String(next).padStart(MIN_DIGITS, '0')}`;
}

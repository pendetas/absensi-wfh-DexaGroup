import { INDONESIAN_MOBILE_PATTERN, normalizeIndonesianPhone } from './phone';

describe('normalizeIndonesianPhone', () => {
  it.each([
    ['081234567890', '+6281234567890'],
    ['0812-3456-7890', '+6281234567890'],
    ['0812 3456 7890', '+6281234567890'],
    ['(0812) 3456.7890', '+6281234567890'],
    ['6281234567890', '+6281234567890'],
    ['+62 812-3456-7890', '+6281234567890'],
  ])('stores %s as %s', (input, expected) => {
    expect(normalizeIndonesianPhone(input)).toBe(expected);
  });

  it('turns an empty value into undefined so "required" validation reports it', () => {
    expect(normalizeIndonesianPhone('  ')).toBeUndefined();
  });

  it('leaves non-strings for the validator to reject', () => {
    expect(normalizeIndonesianPhone(812)).toBe(812);
  });
});

describe('INDONESIAN_MOBILE_PATTERN', () => {
  const isValid = (input: string) =>
    INDONESIAN_MOBILE_PATTERN.test(normalizeIndonesianPhone(input) as string);

  it('accepts mobile numbers of 10 to 13 local digits', () => {
    expect(isValid('0812345678')).toBe(true);
    expect(isValid('0812345678901')).toBe(true);
  });

  it('rejects landlines, short numbers and foreign numbers', () => {
    expect(isValid('0215551234')).toBe(false);
    expect(isValid('08123')).toBe(false);
    expect(isValid('+14155552671')).toBe(false);
    expect(isValid('08123456abcd')).toBe(false);
  });
});

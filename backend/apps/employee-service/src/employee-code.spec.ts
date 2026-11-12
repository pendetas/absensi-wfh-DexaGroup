import { nextEmployeeCode } from './employee-code';

describe('nextEmployeeCode', () => {
  it('starts at EMP001 when there are no employees', () => {
    expect(nextEmployeeCode(null)).toBe('EMP001');
  });

  it('increments and keeps the zero padding', () => {
    expect(nextEmployeeCode('EMP005')).toBe('EMP006');
    expect(nextEmployeeCode('EMP099')).toBe('EMP100');
  });

  it('grows past three digits instead of wrapping', () => {
    expect(nextEmployeeCode('EMP999')).toBe('EMP1000');
    expect(nextEmployeeCode('EMP1000')).toBe('EMP1001');
  });
});

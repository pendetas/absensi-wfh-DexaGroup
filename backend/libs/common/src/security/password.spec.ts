import { generateTemporaryPassword, meetsPasswordPolicy } from './password';

describe('meetsPasswordPolicy', () => {
  it('accepts 8 or more characters with a letter and a digit', () => {
    expect(meetsPasswordPolicy('abcdefg1')).toBe(true);
    expect(meetsPasswordPolicy('Password123!')).toBe(true);
  });

  it('rejects passwords that are too short, or lack a letter or a digit', () => {
    expect(meetsPasswordPolicy('abc1')).toBe(false);
    expect(meetsPasswordPolicy('abcdefgh')).toBe(false);
    expect(meetsPasswordPolicy('12345678')).toBe(false);
  });

  it('rejects more than 72 characters, which bcrypt would silently cut off', () => {
    expect(meetsPasswordPolicy('a1'.repeat(36))).toBe(true);
    expect(meetsPasswordPolicy('a1'.repeat(36) + 'x')).toBe(false);
  });
});

describe('generateTemporaryPassword', () => {
  const samples = Array.from({ length: 300 }, () => generateTemporaryPassword());

  it('is 12 characters and always passes the password policy', () => {
    for (const password of samples) {
      expect(password).toHaveLength(12);
      expect(meetsPasswordPolicy(password)).toBe(true);
    }
  });

  it('always has an uppercase letter, a lowercase letter and a digit', () => {
    for (const password of samples) {
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/\d/);
    }
  });

  it('never uses characters that are easy to misread', () => {
    for (const password of samples) expect(password).not.toMatch(/[0O1lI]/);
  });

  it('does not repeat', () => {
    expect(new Set(samples).size).toBe(samples.length);
  });
});

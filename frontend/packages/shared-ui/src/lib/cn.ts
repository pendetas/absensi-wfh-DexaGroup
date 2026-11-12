/** Joins class names, skipping falsy ones: cn('a', isActive && 'b'). */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

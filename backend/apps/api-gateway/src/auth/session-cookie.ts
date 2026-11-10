import type { CookieOptions, Request, Response } from 'express';
import type { SessionResult } from '@app/common';

export const SESSION_COOKIE = 'dexa_session';

// httpOnly keeps the refresh token away from JavaScript (XSS); the path limits it to auth routes.
const baseOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'strict',
  path: '/api/auth',
});

/** Trusted devices get a dated cookie; otherwise it's a browser-session cookie. */
export function setSessionCookie(response: Response, session: SessionResult): void {
  response.cookie(SESSION_COOKIE, session.refreshToken, {
    ...baseOptions(),
    ...(session.persistent ? { expires: new Date(session.refreshExpiresAt) } : {}),
  });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE, baseOptions());
}

export function readSessionCookie(request: Request): string | undefined {
  const value = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** The refresh token never leaves the gateway in a response body. */
export function toClientSession({ accessToken, expiresIn, user }: SessionResult) {
  return { accessToken, expiresIn, user };
}

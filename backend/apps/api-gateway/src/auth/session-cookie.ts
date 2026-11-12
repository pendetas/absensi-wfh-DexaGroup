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

/**
 * A readable marker beside the httpOnly cookie. It holds no secret: the frontend only checks
 * that it exists, so a first-time visitor isn't sent to /auth/refresh just to get a 401.
 */
export const SIGNED_IN_COOKIE = 'dexa_signed_in';

const markerOptions = (): CookieOptions => ({ ...baseOptions(), httpOnly: false, path: '/' });

/** Trusted devices get a dated cookie; otherwise it's a browser-session cookie. */
export function setSessionCookie(response: Response, session: SessionResult): void {
  const lifetime = session.persistent ? { expires: new Date(session.refreshExpiresAt) } : {};
  response.cookie(SESSION_COOKIE, session.refreshToken, { ...baseOptions(), ...lifetime });
  response.cookie(SIGNED_IN_COOKIE, '1', { ...markerOptions(), ...lifetime });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE, baseOptions());
  response.clearCookie(SIGNED_IN_COOKIE, markerOptions());
}

export function readSessionCookie(request: Request): string | undefined {
  const value = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** The refresh token never leaves the gateway in a response body. */
export function toClientSession({ accessToken, expiresIn, user }: SessionResult) {
  return { accessToken, expiresIn, user };
}

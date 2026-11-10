import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { IsNull, Not, Repository } from 'typeorm';
import { AccessTokenResult, ClientInfo, JwtPayload, rpcError, SessionResult } from '@app/common';
import { Session } from './entities/session.entity';
import { User } from './entities/user.entity';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const SESSION_EXPIRED_MESSAGE = 'Sesi Anda telah berakhir, silakan login kembali';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session) private readonly sessionRepository: Repository<Session>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async start(user: User, persistent: boolean, client: ClientInfo): Promise<SessionResult> {
    const ttlMs = persistent
      ? Number(this.config.get('SESSION_TRUSTED_DAYS', 7)) * 24 * 60 * 60 * 1000
      : Number(this.config.get('SESSION_DEFAULT_HOURS', 12)) * 60 * 60 * 1000;
    const secret = randomBytes(32).toString('base64url');

    const session = await this.sessionRepository.save(
      this.sessionRepository.create({
        userId: user.id,
        tokenHash: sha256(secret),
        persistent,
        expiresAt: new Date(Date.now() + ttlMs),
        lastUsedAt: new Date(),
        userAgent: client.userAgent?.slice(0, 255) ?? null,
        ipAddress: client.ipAddress ?? null,
      }),
    );
    return this.buildResult(user, session, secret);
  }

  /** Rotates the secret. Presenting an old secret means the token leaked, so the session dies. */
  async refresh(refreshToken: string, client: ClientInfo): Promise<SessionResult> {
    const parsed = this.parse(refreshToken);
    const session = parsed
      ? await this.sessionRepository.findOne({
          where: { id: parsed.id },
          relations: { user: true },
        })
      : null;

    if (!parsed || !session || session.revokedAt || session.expiresAt <= new Date()) {
      throw rpcError(HttpStatus.UNAUTHORIZED, SESSION_EXPIRED_MESSAGE);
    }
    if (!this.hashMatches(parsed.secret, session.tokenHash) || !session.user.isActive) {
      await this.sessionRepository.update(session.id, { revokedAt: new Date() });
      throw rpcError(HttpStatus.UNAUTHORIZED, SESSION_EXPIRED_MESSAGE);
    }

    const secret = randomBytes(32).toString('base64url');
    session.tokenHash = sha256(secret);
    session.lastUsedAt = new Date();
    session.userAgent = client.userAgent?.slice(0, 255) ?? session.userAgent;
    session.ipAddress = client.ipAddress ?? session.ipAddress;
    await this.sessionRepository.save(session);
    return this.buildResult(session.user, session, secret);
  }

  /** Idempotent: an unknown or already-revoked token is not an error. */
  async revokeByToken(refreshToken: string): Promise<void> {
    const parsed = this.parse(refreshToken);
    if (!parsed) return;
    const session = await this.sessionRepository.findOneBy({ id: parsed.id });
    if (session && !session.revokedAt && this.hashMatches(parsed.secret, session.tokenHash)) {
      await this.sessionRepository.update(session.id, { revokedAt: new Date() });
    }
  }

  async revokeAllForUser(userId: number, exceptSessionId?: number): Promise<void> {
    await this.sessionRepository.update(
      {
        userId,
        revokedAt: IsNull(),
        ...(exceptSessionId ? { id: Not(exceptSessionId) } : {}),
      },
      { revokedAt: new Date() },
    );
  }

  async issueAccessToken(user: User, sessionId: number): Promise<AccessTokenResult> {
    const payload: JwtPayload = {
      sub: user.id,
      sid: sessionId,
      employeeId: user.employeeId,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      expiresIn: Number(this.config.get('JWT_ACCESS_EXPIRES_IN', 900)),
    };
  }

  private async buildResult(user: User, session: Session, secret: string): Promise<SessionResult> {
    return {
      ...(await this.issueAccessToken(user, session.id)),
      refreshToken: `${session.id}.${secret}`,
      refreshExpiresAt: session.expiresAt.toISOString(),
      persistent: session.persistent,
      user: {
        id: user.id,
        employeeId: user.employeeId,
        employeeCode: user.employeeCode,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  private parse(token: string): { id: number; secret: string } | null {
    const [idPart, secret] = token.split('.');
    const id = Number(idPart);
    return Number.isInteger(id) && id > 0 && secret ? { id, secret } : null;
  }

  private hashMatches(secret: string, storedHash: string): boolean {
    return timingSafeEqual(Buffer.from(sha256(secret)), Buffer.from(storedHash));
  }
}

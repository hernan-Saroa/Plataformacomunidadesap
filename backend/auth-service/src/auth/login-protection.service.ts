import { Injectable, Logger } from '@nestjs/common';

export interface LoginRateLimitState {
  limit: number;
  remaining: number;
  resetAt: number;
  blocked: boolean;
  retryAfterSeconds?: number;
}

export interface AccountLockState {
  locked: boolean;
  retryAfterSeconds?: number;
  remainingAttempts?: number;
}

interface IpRateLimitEntry {
  count: number;
  resetAt: number;
}

interface AccountFailureEntry {
  consecutiveFailures: number;
  lastFailureAt: number;
  lockedUntil?: number;
}

@Injectable()
export class LoginProtectionService {
  private readonly logger = new Logger(LoginProtectionService.name);

  private readonly rateLimitWindowMs = this.readPositiveInt(
    'AUTH_LOGIN_RATE_LIMIT_WINDOW_MS',
    15 * 60 * 1000,
  );
  private readonly rateLimitMaxAttempts = this.readPositiveInt(
    'AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS',
    5,
  );
  private readonly accountLockThreshold = this.readPositiveInt(
    'AUTH_LOGIN_ACCOUNT_LOCK_THRESHOLD',
    10,
  );
  private readonly accountLockMs = this.readPositiveInt(
    'AUTH_LOGIN_ACCOUNT_LOCK_MS',
    15 * 60 * 1000,
  );

  private readonly ipAttempts = new Map<string, IpRateLimitEntry>();
  private readonly accountFailures = new Map<string, AccountFailureEntry>();

  buildAccountKeys(...values: Array<string | null | undefined>): string[] {
    const keys = new Set<string>();

    for (const value of values) {
      const normalized = this.normalizeKey(value);
      if (normalized) {
        keys.add(normalized);
      }
    }

    return [...keys];
  }

  consumeRateLimit(ipAddress: string): LoginRateLimitState {
    this.pruneExpiredEntries();

    const now = Date.now();
    const key = this.normalizeKey(ipAddress) || 'unknown-ip';
    const existing = this.ipAttempts.get(key);

    if (!existing || existing.resetAt <= now) {
      const entry: IpRateLimitEntry = {
        count: 1,
        resetAt: now + this.rateLimitWindowMs,
      };
      this.ipAttempts.set(key, entry);
      return this.buildRateLimitState(entry, false);
    }

    if (existing.count >= this.rateLimitMaxAttempts) {
      return this.buildRateLimitState(existing, true);
    }

    existing.count += 1;
    return this.buildRateLimitState(existing, false);
  }

  getAccountLockState(accountKeys: string[]): AccountLockState {
    this.pruneExpiredEntries();

    const now = Date.now();
    let maxLockedUntil = 0;

    for (const key of accountKeys) {
      const entry = this.accountFailures.get(key);
      if (entry?.lockedUntil && entry.lockedUntil > now) {
        maxLockedUntil = Math.max(maxLockedUntil, entry.lockedUntil);
      }
    }

    if (!maxLockedUntil) {
      return { locked: false };
    }

    return {
      locked: true,
      retryAfterSeconds: Math.max(
        Math.ceil((maxLockedUntil - now) / 1000),
        1,
      ),
    };
  }

  registerFailedAttempt(accountKeys: string[]): AccountLockState {
    this.pruneExpiredEntries();

    if (accountKeys.length === 0) {
      return { locked: false };
    }

    const now = Date.now();
    const primaryEntry = this.accountFailures.get(accountKeys[0]);
    const currentFailures =
      primaryEntry?.lockedUntil && primaryEntry.lockedUntil > now
        ? 0
        : (primaryEntry?.consecutiveFailures || 0) + 1;
    const shouldLock = currentFailures >= this.accountLockThreshold;
    const lockedUntil = shouldLock ? now + this.accountLockMs : undefined;

    for (const key of accountKeys) {
      this.accountFailures.set(key, {
        consecutiveFailures: shouldLock ? 0 : currentFailures,
        lastFailureAt: now,
        lockedUntil,
      });
    }

    if (shouldLock) {
      this.logger.warn(
        `Cuenta temporalmente bloqueada por intentos fallidos: ${accountKeys[0]}`,
      );
      return {
        locked: true,
        remainingAttempts: 0,
        retryAfterSeconds: Math.max(
          Math.ceil((lockedUntil! - now) / 1000),
          1,
        ),
      };
    }

    return {
      locked: false,
      remainingAttempts: this.accountLockThreshold - currentFailures,
    };
  }

  clearFailedAttempts(accountKeys: string[]): void {
    if (accountKeys.length === 0) {
      return;
    }

    for (const key of accountKeys) {
      this.accountFailures.delete(key);
    }
  }

  clearIpRateLimit(ipAddress: string): void {
    const key = this.normalizeKey(ipAddress) || 'unknown-ip';
    this.ipAttempts.delete(key);
  }

  private buildRateLimitState(
    entry: IpRateLimitEntry,
    blocked: boolean,
  ): LoginRateLimitState {
    const now = Date.now();
    const remaining = blocked
      ? 0
      : Math.max(this.rateLimitMaxAttempts - entry.count, 0);

    return {
      limit: this.rateLimitMaxAttempts,
      remaining,
      resetAt: entry.resetAt,
      blocked,
      retryAfterSeconds: blocked
        ? Math.max(Math.ceil((entry.resetAt - now) / 1000), 1)
        : undefined,
    };
  }

  private pruneExpiredEntries(): void {
    const now = Date.now();

    for (const [key, entry] of this.ipAttempts.entries()) {
      if (entry.resetAt <= now) {
        this.ipAttempts.delete(key);
      }
    }

    for (const [key, entry] of this.accountFailures.entries()) {
      if (entry.lockedUntil && entry.lockedUntil > now) {
        continue;
      }

      if (entry.lockedUntil && entry.lockedUntil <= now) {
        this.accountFailures.delete(key);
        continue;
      }

      if (now - entry.lastFailureAt > this.accountLockMs) {
        this.accountFailures.delete(key);
      }
    }
  }

  private normalizeKey(value?: string | null): string {
    return value?.trim().toLowerCase() || '';
  }

  private readPositiveInt(name: string, fallback: number): number {
    const rawValue = process.env[name];
    const parsed = Number.parseInt(rawValue || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}

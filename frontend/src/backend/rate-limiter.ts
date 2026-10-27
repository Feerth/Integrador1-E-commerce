/**
 * Limita intentos fallidos de login por clave (IP + correo) dentro de una ventana de tiempo.
 * Tras `maxAttempts` fallos se bloquea la clave durante `lockMs`. Un login correcto la reinicia.
 */
export class LoginRateLimiter {
  private readonly entries = new Map<string, { fails: number; first: number; lockedUntil: number }>();

  constructor(
    private readonly maxAttempts = 5,
    private readonly windowMs = 15 * 60_000,
    private readonly lockMs = 15 * 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  /** Segundos que faltan para poder reintentar, o 0 si no está bloqueado. */
  retryAfterSeconds(key: string): number {
    const e = this.entries.get(key);
    if (!e) return 0;
    const t = this.now();
    if (e.lockedUntil > t) return Math.ceil((e.lockedUntil - t) / 1000);
    if (e.lockedUntil && e.lockedUntil <= t) this.entries.delete(key);
    return 0;
  }

  registerFailure(key: string): void {
    const t = this.now();
    let e = this.entries.get(key);
    if (!e || t - e.first > this.windowMs) {
      e = { fails: 0, first: t, lockedUntil: 0 };
      this.entries.set(key, e);
    }
    e.fails++;
    if (e.fails >= this.maxAttempts) e.lockedUntil = t + this.lockMs;
    if (this.entries.size > 10_000) this.prune();
  }

  registerSuccess(key: string): void {
    this.entries.delete(key);
  }

  private prune(): void {
    const t = this.now();
    for (const [k, e] of this.entries) if (e.lockedUntil <= t && t - e.first > this.windowMs) this.entries.delete(k);
  }
}

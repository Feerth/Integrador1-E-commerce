import { describe, expect, it } from 'vitest';
import { LoginRateLimiter } from './rate-limiter';

describe('LoginRateLimiter', () => {
  it('no bloquea antes de llegar al máximo de intentos', () => {
    const rl = new LoginRateLimiter(3, 1000, 1000, () => 0);
    rl.registerFailure('k'); rl.registerFailure('k');
    expect(rl.retryAfterSeconds('k')).toBe(0);
  });

  it('bloquea al alcanzar el máximo y informa el tiempo restante', () => {
    const rl = new LoginRateLimiter(3, 60_000, 30_000, () => 0);
    for (let i = 0; i < 3; i++) rl.registerFailure('k');
    expect(rl.retryAfterSeconds('k')).toBe(30);
  });

  it('desbloquea cuando pasa el tiempo de bloqueo', () => {
    let t = 0;
    const rl = new LoginRateLimiter(2, 60_000, 30_000, () => t);
    rl.registerFailure('k'); rl.registerFailure('k');
    t = 30_001;
    expect(rl.retryAfterSeconds('k')).toBe(0);
  });

  it('un login correcto reinicia el contador', () => {
    const rl = new LoginRateLimiter(2, 60_000, 30_000, () => 0);
    rl.registerFailure('k'); rl.registerSuccess('k'); rl.registerFailure('k');
    expect(rl.retryAfterSeconds('k')).toBe(0);
  });

  it('los fallos fuera de la ventana no se acumulan', () => {
    let t = 0;
    const rl = new LoginRateLimiter(2, 1000, 30_000, () => t);
    rl.registerFailure('k'); t = 2000; rl.registerFailure('k');
    expect(rl.retryAfterSeconds('k')).toBe(0);
  });

  it('las claves son independientes', () => {
    const rl = new LoginRateLimiter(1, 1000, 1000, () => 0);
    rl.registerFailure('a');
    expect(rl.retryAfterSeconds('b')).toBe(0);
  });
});

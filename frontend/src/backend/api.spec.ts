
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApi } from './api';
import { hashPassword } from './auth';
import { DemoStore } from './demo-store';
import { LoginRateLimiter } from './rate-limiter';
import { httpsRedirect } from './security';

let server: Server;
let base: string;
let store: DemoStore;

const post = (
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
) =>
  fetch(base + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });

beforeAll(async () => {
  store = new DemoStore();

  const app = express();
  app.use(
    '/api',
    createApi(store, new LoginRateLimiter(3, 60_000, 60_000))
  );

  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, () => {
      resolve();
    });

    server.on('error', reject);
  });

  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

afterAll(() => {
  if (server) {
    server.close();
  }
});

describe('registro y login', () => {
  it('registra un cliente nuevo y devuelve token', async () => {
    const r = await post('/auth/register', {
      nombre: 'Ana Prueba',
      dni: '11112222',
      correo: 'ana@test.com',
      telefono: '999999999',
      password: 'secreto1'
    });

    expect(r.status).toBe(201);
    expect((await r.json()).token).toBeTruthy();
  });

  it('rechaza DNI inválido', async () => {
    const r = await post('/auth/register', {
      nombre: 'Ana Prueba',
      dni: '123',
      correo: 'x@test.com',
      telefono: '999999999',
      password: 'secreto1'
    });

    expect(r.status).toBe(400);
  });

  it('rechaza contraseña corta', async () => {
    const r = await post('/auth/register', {
      nombre: 'Ana Prueba',
      dni: '33334444',
      correo: 'y@test.com',
      telefono: '999999999',
      password: '123'
    });

    expect(r.status).toBe(400);
  });

  it('login correcto devuelve token', async () => {
    const r = await post('/auth/login', {
      correo: 'ana@test.com',
      password: 'secreto1'
    });

    expect(r.status).toBe(200);
    expect((await r.json()).token).toBeTruthy();
  });

  it('login con clave incorrecta da 401 y al 3.er fallo bloquea con 429', async () => {
    const bad = () =>
      post('/auth/login', {
        correo: 'ana@test.com',
        password: 'mala'
      });

    expect((await bad()).status).toBe(401);
    expect((await bad()).status).toBe(401);
    expect((await bad()).status).toBe(401);

    const blocked = await bad();

    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('estando bloqueado, ni la clave correcta entra', async () => {
    const r = await post('/auth/login', {
      correo: 'ana@test.com',
      password: 'secreto1'
    });

    expect(r.status).toBe(429);
  });
});

describe('endpoints protegidos y públicos', () => {
  it('/me/trips sin token da 401', async () => {
    expect((await fetch(base + '/me/trips')).status).toBe(401);
  });

  it('/baggage con formato inválido da 400', async () => {
    expect((await fetch(base + '/baggage/ABC')).status).toBe(400);
  });

  it('/baggage de un código del demo oculta el apellido del pasajero', async () => {
    const r = await fetch(base + '/baggage/EQ-00142');

    expect(r.status).toBe(200);

    const b = await r.json();
    expect(b.pasajero).toMatch(/^\S+ \S\.$/);
  });

  it('/flights devuelve vuelos con categorías y disponibilidad', async () => {
    const r = await fetch(base + '/flights');
    const flights = await r.json();

    expect(flights.length).toBeGreaterThan(0);
    expect(flights[0].categorias[0]).toHaveProperty('disponibles');
  });
});

describe('seguridad HTTPS', () => {
  const run = (force: boolean, headers: Record<string, string>) => {
    const res: Record<string, unknown> = {};
    let redirected = '';
    let nexted = false;

    httpsRedirect(force)(
      {
        secure: false,
        headers: { host: 'sky.test', ...headers },
        originalUrl: '/x'
      } as never,
      {
        setHeader: (k: string, v: string) => (res[k] = v),
        redirect: (_c: number, u: string) => (redirected = u)
      } as never,
      () => (nexted = true)
    );

    return { res, redirected, nexted };
  };

  it('sin FORCE_HTTPS no hace nada', () => {
    expect(run(false, {}).nexted).toBe(true);
  });

  it('con FORCE_HTTPS redirige HTTP a HTTPS', () => {
    expect(run(true, {}).redirected).toBe('https://sky.test/x');
  });

  it('con HTTPS activa HSTS', () => {
    const r = run(true, { 'x-forwarded-proto': 'https' });

    expect(r.nexted).toBe(true);
    expect(r.res['Strict-Transport-Security']).toContain('max-age');
  });
});

describe('hash de contraseñas', () => {
  it('no guarda la clave en claro y usa salt distinto', () => {
    const a = hashPassword('abc12345');
    const b = hashPassword('abc12345');

    expect(a).not.toContain('abc12345');
    expect(a).not.toBe(b);
  });
});

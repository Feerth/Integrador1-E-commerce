import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { AuthResponse, Cliente } from '../models';

const KEY = 'sky.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));

  private _session = signal<{ token: string; cliente: Cliente } | null>(this.load());
  readonly cliente = computed(() => this._session()?.cliente ?? null);
  readonly logged = computed(() => !!this._session());
  get token(): string | null { return this._session()?.token ?? null; }

  private load() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return null;
    try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; }
  }

  private save(r: AuthResponse) {
    const s = { token: r.token, cliente: r.cliente };
    this._session.set(s);
    if (this.browser) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* modo privado */ } }
  }

  login(correo: string, password: string) {
    return this.http.post<AuthResponse>('/api/auth/login', { correo, password }).pipe(tap((r) => this.save(r)));
  }

  register(data: { nombre: string; dni: string; correo: string; telefono: string; password: string }) {
    return this.http.post<AuthResponse>('/api/auth/register', data).pipe(tap((r) => this.save(r)));
  }

  logout() {
    this._session.set(null);
    if (this.browser) { try { localStorage.removeItem(KEY); } catch { /* noop */ } }
    this.router.navigateByUrl('/trip/home');
  }

  /** Si la API responde 401 la sesión venció: se limpia sin redirigir (el guard lo hará). */
  expire() { this._session.set(null); if (this.browser) { try { localStorage.removeItem(KEY); } catch { /* noop */ } } }
}

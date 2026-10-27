import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Equipaje, Checkin, Vuelo, Viaje } from '../models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private headers() {
    const t = this.auth.token;
    return t ? { headers: new HttpHeaders({ Authorization: `Bearer ${t}` }) } : {};
  }

  airports() { return this.http.get<string[]>('/api/airports'); }
  flights(q: { origen?: string; destino?: string; fecha?: string }) {
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(q)) if (v) params[k] = v;
    return this.http.get<Vuelo[]>('/api/flights', { params });
  }
  book(vueloCodigo: string, categoria: string) {
    return this.http.post<{ reserva: Viaje; precio: number | null }>('/api/bookings', { vueloCodigo, categoria }, this.headers());
  }
  myTrips() { return this.http.get<Viaje[]>('/api/me/trips', this.headers()); }
  checkin(reservaCodigo: string) { return this.http.post<Checkin>('/api/checkin', { reservaCodigo }, this.headers()); }
  baggage(codigo: string) { return this.http.get<Equipaje>(`/api/baggage/${encodeURIComponent(codigo)}`); }
  myBaggage() { return this.http.get<Equipaje[]>('/api/me/baggage', this.headers()); }
}

/** Texto de error legible a partir de la respuesta del servidor. */
export function errorMsg(e: unknown): string {
  const err = e as { error?: { error?: string }; status?: number };
  if (err?.error?.error) return err.error.error;
  if (err?.status === 0) return 'No se pudo conectar con el servidor.';
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

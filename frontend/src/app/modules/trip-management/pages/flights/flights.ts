import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, errorMsg } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Vuelo, Viaje } from '../../../../core/models';
import { ciudad, etiquetaVuelo, fechaLarga, iata } from '../../../../core/labels';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-flights',
  templateUrl: './flights.html',
  styleUrl: './flights.scss',
})
export class Flights implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  vuelos = signal<Vuelo[]>([]);
  loading = signal(true);
  error = signal('');
  booking = signal('');          // clave vuelo|categoria en proceso
  confirmada = signal<{ reserva: Viaje; precio: number | null; vuelo: Vuelo } | null>(null);
  categoria = '';
  q = { origen: '', destino: '', fecha: '' };
  ciudad = ciudad; iata = iata; etiquetaVuelo = etiquetaVuelo; fechaLarga = fechaLarga;

  ngOnInit() {
    const p = this.route.snapshot.queryParamMap;
    this.q = { origen: p.get('origen') ?? '', destino: p.get('destino') ?? '', fecha: p.get('fecha') ?? '' };
    this.categoria = p.get('categoria') ?? '';
    this.buscar();
  }

  buscar() {
    this.loading.set(true); this.error.set('');
    this.api.flights(this.q).subscribe({
      next: (v) => { this.vuelos.set(v); this.loading.set(false); },
      error: (e) => { this.error.set(errorMsg(e)); this.loading.set(false); },
    });
  }

  visibles() {
    return this.vuelos().filter((v) => !this.categoria || v.categorias.some((c) => c.categoria === this.categoria));
  }

  badge(e: string) { return e === 'ACTIVO' ? 'badge--ok' : e === 'RETRASADO' || e === 'EMBARCANDO' ? 'badge--warn' : e === 'CANCELADO' ? 'badge--bad' : ''; }

  reservar(v: Vuelo, categoria: string) {
    if (!this.auth.logged()) {
      this.router.navigate(['/auth/login'], { queryParams: { redirect: this.router.url } });
      return;
    }
    this.booking.set(v.codigo + '|' + categoria); this.error.set('');
    this.api.book(v.codigo, categoria).subscribe({
      next: (r) => { this.confirmada.set({ ...r, vuelo: v }); this.booking.set(''); this.buscar(); },
      error: (e) => { this.error.set(errorMsg(e)); this.booking.set(''); },
    });
  }
}

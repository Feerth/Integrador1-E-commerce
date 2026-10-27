import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { ApiService, errorMsg } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Equipaje, Viaje } from '../../../../core/models';
import { ciudad, etiquetaEquipaje, etiquetaReserva, etiquetaVuelo, esIncidencia, fechaLarga, iata } from '../../../../core/labels';

@Component({
  imports: [RouterLink],
  selector: 'app-my-trips',
  templateUrl: './my-trips.html',
  styleUrl: './my-trips.scss',
})
export class MyTrips implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  trips = signal<Viaje[]>([]);
  bags = signal<Equipaje[]>([]);
  loading = signal(true);
  error = signal('');
  ciudad = ciudad; iata = iata; fechaLarga = fechaLarga; etiquetaReserva = etiquetaReserva; etiquetaVuelo = etiquetaVuelo;
  etiquetaEquipaje = etiquetaEquipaje; esIncidencia = esIncidencia;

  ngOnInit() {
    forkJoin({ t: this.api.myTrips(), b: this.api.myBaggage().pipe(catchError(() => of([] as Equipaje[]))) }).subscribe({
      next: ({ t, b }) => { this.trips.set(t); this.bags.set(b); this.loading.set(false); },
      error: (e) => { if ((e as { status?: number }).status === 401) this.auth.logout(); this.error.set(errorMsg(e)); this.loading.set(false); },
    });
  }
  bagsOf(t: Viaje) { return this.bags().filter((b) => b.vuelo.codigo === t.vueloCodigo); }
  badge(e: string) { return e === 'CONFIRMADA' ? 'badge--ok' : e === 'CANCELADA' ? 'badge--bad' : 'badge--info'; }
}

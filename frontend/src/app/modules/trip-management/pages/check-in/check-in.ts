import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errorMsg } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Viaje } from '../../../../core/models';
import { fechaLarga } from '../../../../core/labels';

@Component({
  imports: [RouterLink],
  selector: 'app-check-in',
  templateUrl: './check-in.html',
  styleUrl: './check-in.scss',
})
export class CheckIn implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  trips = signal<Viaje[]>([]);
  loading = signal(true);
  working = signal('');
  error = signal('');
  fechaLarga = fechaLarga;

  ngOnInit() { this.cargar(); }
  cargar() {
    this.api.myTrips().subscribe({
      next: (t) => { this.trips.set(t.filter((x) => x.estado === 'CONFIRMADA')); this.loading.set(false); },
      error: (e) => { if ((e as { status?: number }).status === 401) this.auth.logout(); this.error.set(errorMsg(e)); this.loading.set(false); },
    });
  }
  hacer(t: Viaje) {
    this.working.set(t.codigo); this.error.set('');
    this.api.checkin(t.codigo).subscribe({
      next: () => { this.working.set(''); this.cargar(); },
      error: (e) => { this.error.set(errorMsg(e)); this.working.set(''); },
    });
  }
  embarque(t: Viaje) {
    if (!t.vuelo) return '';
    const [h, m] = t.vuelo.horaSalida.split(':').map(Number);
    const mins = h * 60 + m - 40;
    const x = ((mins % 1440) + 1440) % 1440;
    return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  }
}

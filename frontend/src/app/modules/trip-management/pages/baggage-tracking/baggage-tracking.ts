import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, errorMsg } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Equipaje } from '../../../../core/models';
import { RECORRIDO_EQUIPAJE, ciudad, detalleEquipaje, esIncidencia, etiquetaEquipaje, fechaHora, fechaLarga } from '../../../../core/labels';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-baggage-tracking',
  templateUrl: './baggage-tracking.html',
  styleUrl: './baggage-tracking.scss',
})
export class BaggageTracking implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);

  codigo = '';
  result = signal<Equipaje | null>(null);
  mine = signal<Equipaje[]>([]);
  loading = signal(false);
  error = signal('');
  updated = signal<Date | null>(null);
  private timer: ReturnType<typeof setInterval> | undefined;

  pasos = RECORRIDO_EQUIPAJE;
  etiqueta = etiquetaEquipaje; detalle = detalleEquipaje; esIncidencia = esIncidencia; fechaHora = fechaHora; fechaLarga = fechaLarga; ciudad = ciudad;

  ngOnInit() {
    if (this.auth.logged()) this.api.myBaggage().subscribe({ next: (b) => this.mine.set(b), error: () => {} });
    const c = this.route.snapshot.queryParamMap.get('codigo');
    if (c) { this.codigo = c; this.buscar(); }
    // El personal actualiza el estado desde el programa de escritorio: refrescamos cada 30 s.
    this.timer = setInterval(() => { if (this.result()) this.consultar(this.result()!.codigo, true); }, 30000);
  }
  ngOnDestroy() { clearInterval(this.timer); }

  buscar() {
    const c = this.codigo.trim().toUpperCase();
    if (!c) return;
    this.router.navigate([], { queryParams: { codigo: c }, replaceUrl: true });
    this.consultar(c, false);
  }
  elegir(c: string) { this.codigo = c; this.buscar(); }

  private consultar(c: string, silent: boolean) {
    if (!silent) { this.loading.set(true); this.error.set(''); this.result.set(null); }
    this.api.baggage(c).subscribe({
      next: (r) => { this.result.set(r); this.loading.set(false); this.updated.set(new Date()); },
      error: (e) => { if (!silent) { this.error.set(errorMsg(e)); this.loading.set(false); } },
    });
  }

  /** Índice del paso actual dentro del recorrido normal (en una incidencia se usa el último paso normal alcanzado). */
  actual(r: Equipaje): number {
    const i = this.pasos.indexOf(r.estado);
    if (i >= 0) return i;
    const vistos = r.historial.map((h) => this.pasos.indexOf(h.estado)).filter((x) => x >= 0);
    return vistos.length ? Math.max(...vistos) : 0;
  }
  historialInverso(r: Equipaje) { return [...r.historial].reverse(); }
}

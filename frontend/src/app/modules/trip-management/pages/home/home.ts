import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ApiService } from '../../../../core/services/api.service';
import { aYmd } from '../../../../core/labels';

@Component({
  imports: [CommonModule, FormsModule, RouterLink, MatDatepickerModule, MatNativeDateModule, MatInputModule, MatFormFieldModule],
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private router = inject(Router);
  private api = inject(ApiService);

  tripType: 'roundtrip' | 'oneway' = 'roundtrip';
  origen = ''; destino = ''; categoria = '';
  departureDate: Date | null = null;
  returnDate: Date | null = null;
  minDate: Date = new Date();
  airports: string[] = [];
  codigoEquipaje = '';

  ngOnInit() { this.api.airports().subscribe({ next: (a) => (this.airports = a), error: () => {} }); }

  onTripTypeChange(): void { if (this.tripType === 'oneway') this.returnDate = null; }

  buscar(): void {
    const q: Record<string, string> = {};
    if (this.origen) q['origen'] = this.origen;
    if (this.destino) q['destino'] = this.destino;
    if (this.departureDate) q['fecha'] = aYmd(this.departureDate);
    if (this.categoria) q['categoria'] = this.categoria;
    if (this.tripType === 'roundtrip' && this.returnDate) q['vuelta'] = aYmd(this.returnDate);
    this.router.navigate(['/trip/flights'], { queryParams: q });
  }

  rastrear(): void {
    const c = this.codigoEquipaje.trim();
    if (c) this.router.navigate(['/trip/baggage-tracking'], { queryParams: { codigo: c } });
  }
}

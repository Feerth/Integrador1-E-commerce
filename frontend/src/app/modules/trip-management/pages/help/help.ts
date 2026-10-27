import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-help',
  templateUrl: './help.html',
  styleUrl: './help.scss',
})
export class Help {
  faqs = [
    { t: 'Equipaje', items: [
      { q: '¿Cómo rastreo mi maleta?', a: 'Ingresa el código de tu etiqueta (EQ-00000) en la sección Rastrear equipaje. Verás cada punto por el que pasó: check-in, seguridad, bodega, embarque, descarga y entrega.' },
      { q: '¿Qué significan los estados "Retenido", "Pendiente" o "Con incidencia"?', a: 'Son situaciones que el personal de tierra registra cuando la maleta requiere una revisión adicional o falta confirmar su embarque. Verás el motivo en el historial.' },
      { q: 'Mi maleta figura como "Perdida"', a: 'Ya se abrió una investigación. Escríbenos con tu código de equipaje y tu código de reserva para dar seguimiento.' },
    ]},
    { t: 'Check-in', items: [
      { q: '¿Cuándo puedo hacer check-in?', a: 'En línea desde 48 horas hasta 2 horas antes de la salida. Después, acude al mostrador del aeropuerto.' },
      { q: '¿Dónde veo mi pase de abordar?', a: 'Luego de hacer check-in aparece en la misma página de Check-in, con tu asiento, puerta y grupo de embarque.' },
    ]},
    { t: 'Cancelaciones y reembolsos', items: [
      { q: '¿Cómo cancelo o cambio mi reserva?', a: 'Contáctanos con tu código de reserva (RES-00000). Si el vuelo es cancelado por SKY, se te ofrecerá reprogramación o reembolso.' },
      { q: '¿Cuánto demora un reembolso?', a: 'Una vez aprobado, hasta 15 días hábiles según el medio de pago.' },
    ]},
  ];
}

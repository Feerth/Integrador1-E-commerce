/** Mismos estados y etiquetas que usa el programa de escritorio (Baggage.java / Flight.java). */
export const RECORRIDO_EQUIPAJE = ['REGISTRADO', 'CONTROL_SEGURIDAD', 'DISTRIBUCION_CINTA', 'EN_BODEGA', 'EMBARCADO', 'DESCARGADO', 'ENTREGADO'];
export const INCIDENCIAS_EQUIPAJE = ['PENDIENTE', 'RETENIDO', 'PERDIDO', 'CON_INCIDENCIA'];

const EQUIPAJE: Record<string, string> = {
  REGISTRADO: 'Registrado', CONTROL_SEGURIDAD: 'Control de seguridad', DISTRIBUCION_CINTA: 'Distribución a cinta',
  EN_BODEGA: 'En bodega', EMBARCADO: 'Embarcado', DESCARGADO: 'Descargado', ENTREGADO: 'Entregado',
  PENDIENTE: 'Pendiente', RETENIDO: 'Retenido', PERDIDO: 'Perdido', CON_INCIDENCIA: 'Con incidencia',
};
const EQUIPAJE_DETALLE: Record<string, string> = {
  REGISTRADO: 'Tu maleta fue recibida en el mostrador de check-in.',
  CONTROL_SEGURIDAD: 'Tu maleta está pasando el control de seguridad.',
  DISTRIBUCION_CINTA: 'Tu maleta está siendo clasificada para tu vuelo.',
  EN_BODEGA: 'Tu maleta está en la bodega de carga, lista para embarcar.',
  EMBARCADO: 'Tu maleta ya está dentro de la aeronave.',
  DESCARGADO: 'Tu maleta llegó a destino y fue descargada en plataforma.',
  ENTREGADO: 'Tu maleta está disponible en la cinta de entrega.',
  PENDIENTE: 'Estamos esperando la confirmación de embarque de tu maleta.',
  RETENIDO: 'Tu maleta fue retenida para una inspección adicional.',
  PERDIDO: 'No pudimos ubicar tu maleta; abrimos una investigación.',
  CON_INCIDENCIA: 'Se reportó una incidencia con tu maleta.',
};
const VUELO: Record<string, string> = { ACTIVO: 'Programado', RETRASADO: 'Retrasado', EMBARCANDO: 'Embarcando', COMPLETADO: 'Completado', CANCELADO: 'Cancelado' };
const RESERVA: Record<string, string> = { CONFIRMADA: 'Confirmada', COMPLETADA: 'Completada', CANCELADA: 'Cancelada' };

export const etiquetaEquipaje = (e: string) => EQUIPAJE[e] ?? e;
export const detalleEquipaje = (e: string) => EQUIPAJE_DETALLE[e] ?? '';
export const etiquetaVuelo = (e: string) => VUELO[e] ?? e;
export const etiquetaReserva = (e: string) => RESERVA[e] ?? e;
export const esIncidencia = (e: string) => INCIDENCIAS_EQUIPAJE.includes(e);

/** "Lima (LIM)" -> "Lima" */
export const ciudad = (s: string) => s.replace(/\s*\(.*\)\s*$/, '');
/** "Lima (LIM)" -> "LIM" */
export const iata = (s: string) => s.match(/\((\w+)\)/)?.[1] ?? s;

export function fechaLarga(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00`);
  return isNaN(+d) ? ymd : d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
export function fechaHora(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(+d) ? iso : d.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export const aYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

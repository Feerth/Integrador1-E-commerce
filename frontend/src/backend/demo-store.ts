import type { Baggage, Client, Flight, FlightQuery, Passenger, Reservation, Store, WebAccount, WebCheckin } from './types';

/**
 * Almacén en memoria con datos de ejemplo parecidos a los del programa de escritorio.
 * Se usa solo cuando no hay MongoDB disponible (SKY_DEMO=1 o si falla la conexión),
 * para poder desarrollar/mostrar la web sin la base real. NO comparte datos con el escritorio.
 */

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoLocal = (d: Date) => `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };

const SECUENCIA = ['REGISTRADO', 'CONTROL_SEGURIDAD', 'DISTRIBUCION_CINTA', 'EN_BODEGA', 'EMBARCADO', 'DESCARGADO', 'ENTREGADO'];
const short = (s: string) => s.match(/\((\w+)\)/)?.[1] ?? s;

function punto(estado: string, o: string, d: string, vuelo: string): string {
  switch (estado) {
    case 'REGISTRADO': return `Mostrador check-in ${o}`;
    case 'CONTROL_SEGURIDAD': return `Control de seguridad ${o}`;
    case 'DISTRIBUCION_CINTA': return `Banda de clasificación ${o}`;
    case 'EN_BODEGA': return `Bodega de carga — vuelo ${vuelo}`;
    case 'EMBARCADO': return `Embarcado en aeronave — ${o}`;
    case 'DESCARGADO': return `Descargado en plataforma ${d}`;
    case 'ENTREGADO': return `Cinta de entrega ${d}`;
    default: return o;
  }
}

function maleta(f: Flight, codigo: string, pasajero: string, cat: string, estado: string): Baggage {
  const o = short(f.origen), d = short(f.destino);
  const now = Date.now();
  const idx = SECUENCIA.indexOf(estado);
  const historial = [];
  if (idx >= 0) {
    for (let i = 0; i <= idx; i++) {
      historial.push({ estado: SECUENCIA[i], fecha: isoLocal(new Date(now - (idx - i) * 12 * 60000)), usuario: 'Op. García', punto: punto(SECUENCIA[i], o, d, f.codigo), observacion: null });
    }
  } else {
    const obs = estado === 'RETENIDO' ? 'Retenido para inspección adicional en control de seguridad.' : estado === 'PERDIDO' ? 'No fue localizado en la cinta de destino; en investigación.' : 'Incidencia reportada durante el manejo del equipaje.';
    historial.push({ estado: 'REGISTRADO', fecha: isoLocal(new Date(now - 24 * 60000)), usuario: 'Op. García', punto: `Mostrador check-in ${o}`, observacion: null });
    historial.push({ estado: 'CONTROL_SEGURIDAD', fecha: isoLocal(new Date(now - 12 * 60000)), usuario: 'Op. Mamani', punto: `Control de seguridad ${o}`, observacion: null });
    historial.push({ estado, fecha: isoLocal(new Date(now)), usuario: 'Op. Supervisor', punto: estado === 'PERDIDO' ? `Cinta de entrega ${d}` : `Control de seguridad ${o}`, observacion: obs });
  }
  return { codigo, pasajero, categoriaPeso: cat, estado, observaciones: null, historial };
}

function vuelo(codigo: string, dias: number, sale: string, llega: string, origen: string, destino: string, estado: string, cap = 180): Flight {
  return {
    codigo, fecha: addDays(dias), horaSalida: sale, horaLlegadaEstimada: llega, origen, destino, capacidad: cap,
    modeloAvion: 'Airbus A320', matricula: 'OB-2145', estado,
    seatCategories: [
      { categoria: 'Económico', total: 140, vendidos: 60, cancelados: 3 },
      { categoria: 'Económico Premium', total: 30, vendidos: 12, cancelados: 1 },
      { categoria: 'Business', total: 10, vendidos: 4, cancelados: 0 },
    ],
    passengers: [], baggageItems: [],
  };
}

export class DemoStore implements Store {
  readonly mode = 'demo' as const;
  private flights: Flight[] = [];
  private clients: Client[] = [];
  private accounts: WebAccount[] = [];
  private checkins: WebCheckin[] = [];

  constructor() {
    const LIM = 'Lima (LIM)', CUZ = 'Cusco (CUZ)', AQP = 'Arequipa (AQP)', TRU = 'Trujillo (TRU)', PIU = 'Piura (PIU)', SCL = 'Santiago (SCL)', MIA = 'Miami (MIA)', IQT = 'Iquitos (IQT)';
    const f101 = vuelo('SK-101', 1, '06:15', '07:45', LIM, CUZ, 'ACTIVO');
    const f214 = vuelo('SK-214', 0, '23:30', '23:59', LIM, AQP, 'RETRASADO', 150);
    const f320 = vuelo('SK-320', 0, '10:00', '11:20', CUZ, LIM, 'COMPLETADO');
    const f415 = vuelo('SK-415', 0, '11:45', '12:50', LIM, TRU, 'EMBARCANDO', 120);
    const f522 = vuelo('SK-522', 2, '14:20', '15:40', AQP, LIM, 'ACTIVO');
    const f633 = vuelo('SK-633', 1, '16:00', '17:10', LIM, PIU, 'CANCELADO', 150);
    const f102 = vuelo('SK-102', 1, '09:15', '10:35', LIM, CUZ, 'ACTIVO');
    const f113 = vuelo('SK-113', 3, '08:00', '13:30', LIM, SCL, 'ACTIVO');
    const f120 = vuelo('SK-120', 4, '22:10', '05:40', LIM, MIA, 'ACTIVO');
    const f131 = vuelo('SK-131', 2, '07:20', '09:10', LIM, IQT, 'ACTIVO');
    this.flights = [f101, f214, f320, f415, f522, f633, f102, f113, f120, f131];
    // El estado de una ruta debe verse en ambos sentidos
    this.flights.push(vuelo('SK-103', 2, '12:00', '13:25', CUZ, LIM, 'ACTIVO'), vuelo('SK-104', 3, '18:30', '20:00', TRU, LIM, 'ACTIVO'));

    const pax = (f: Flight, nombre: string, asiento: string, cat: string) => f.passengers.push({ nombre, asiento, categoriaAsiento: cat });
    pax(f101, 'Juan Ramos Flores', '12A', 'Económico');
    pax(f101, 'Laura Salas Ortiz', '14C', 'Económico');
    pax(f320, 'Juan Ramos Flores', '8C', 'Económico Premium');
    pax(f214, 'Sofía Delgado Castro', '9C', 'Económico Premium');

    f101.baggageItems.push(
      maleta(f101, 'EQ-00142', 'Juan Ramos Flores', 'Pesado (>23 kg)', 'EMBARCADO'),
      maleta(f101, 'EQ-00143', 'Laura Salas Ortiz', 'Normal (10–23 kg)', 'REGISTRADO'),
      maleta(f101, 'EQ-00145', 'Carmen Díaz López', 'Normal (10–23 kg)', 'DISTRIBUCION_CINTA'),
    );
    f214.baggageItems.push(maleta(f214, 'EQ-00203', 'Sofía Delgado Castro', 'Normal (10–23 kg)', 'RETENIDO'));
    f320.baggageItems.push(
      maleta(f320, 'EQ-00301', 'Juan Ramos Flores', 'Normal (10–23 kg)', 'ENTREGADO'),
      maleta(f320, 'EQ-00303', 'Patricia Flores Condori', 'Pesado (>23 kg)', 'PERDIDO'),
    );

    const r = (codigo: string, v: string, fecha: string, ruta: string, asiento: string, categoria: string, estado: string): Reservation => ({ codigo, vueloCodigo: v, fecha, ruta, asiento, categoria, estado });
    const mk = (id: string, nombre: string, dni: string, correo: string, telefono: string, reservas: Reservation[]): Client => ({ id, nombre, dni, correo, telefono, reservas });
    this.clients = [
      mk('c1', 'Juan Ramos Flores', '45123789', 'jramos@gmail.com', '987 654 321', [
        r('RES-20045', 'SK-101', f101.fecha, 'Lima → Cusco', '12A', 'Económico', 'CONFIRMADA'),
        r('RES-18932', 'SK-320', f320.fecha, 'Cusco → Lima', '8C', 'Económico Premium', 'COMPLETADA'),
      ]),
      mk('c2', 'Laura Salas Ortiz', '40987654', 'lsalas@outlook.com', '912 345 678', [r('RES-20101', 'SK-101', f101.fecha, 'Lima → Cusco', '14C', 'Económico', 'CONFIRMADA')]),
      mk('c3', 'Sofía Delgado Castro', '41029374', 'sofia.delgado3@hotmail.com', '981 100 366', [r('RES-20207', 'SK-214', f214.fecha, 'Lima → Arequipa', '9C', 'Económico Premium', 'CONFIRMADA')]),
    ];
  }

  async searchFlights(q: FlightQuery) {
    const has = (v: string, t?: string) => !t || v.toLowerCase().includes(t.toLowerCase());
    return this.flights
      .filter((f) => has(f.origen, q.origen) && has(f.destino, q.destino) && (!q.fecha || f.fecha === q.fecha))
      .map((f) => ({ ...f, passengers: [], baggageItems: [] }))
      .sort((a, b) => (a.fecha + a.horaSalida).localeCompare(b.fecha + b.horaSalida));
  }
  async getFlight(codigo: string) { return this.flights.find((f) => f.codigo === codigo) ?? null; }
  async listAirports() { return [...new Set(this.flights.flatMap((f) => [f.origen, f.destino]))].sort((a, b) => a.localeCompare(b, 'es')); }

  async findBaggage(codigo: string) {
    for (const flight of this.flights) {
      const baggage = flight.baggageItems.find((b) => b.codigo === codigo);
      if (baggage) return { baggage, flight };
    }
    return null;
  }
  async findBaggageByPassenger(nombre: string) {
    return this.flights.flatMap((flight) => flight.baggageItems.filter((b) => b.pasajero === nombre).map((baggage) => ({ baggage, flight })));
  }

  async findClientByDni(dni: string) { return this.clients.find((c) => c.dni === dni) ?? null; }
  async findClientById(id: string) { return this.clients.find((c) => c.id === id) ?? null; }
  async insertClient(c: Omit<Client, 'id'>) { const n = { ...c, id: `c${this.clients.length + 1}` }; this.clients.push(n); return n; }
  async addReservation(clientId: string, r: Reservation) { this.clients.find((c) => c.id === clientId)?.reservas.push(r); }
  async findAccountByEmail(correo: string) { return this.accounts.find((a) => a.correo === correo.toLowerCase()) ?? null; }
  async findAccountByClientId(clientId: string) { return this.accounts.find((a) => a.clientId === clientId) ?? null; }
  async insertAccount(a: WebAccount) { this.accounts.push({ ...a, correo: a.correo.toLowerCase() }); }
  async bookSeat(vueloCodigo: string, p: Passenger) {
    const f = this.flights.find((x) => x.codigo === vueloCodigo);
    if (!f) return;
    f.passengers.push(p);
    const sc = f.seatCategories.find((c) => c.categoria === p.categoriaAsiento);
    if (sc) sc.vendidos++;
  }
  async findCheckin(reservaCodigo: string) { return this.checkins.find((c) => c.reservaCodigo === reservaCodigo) ?? null; }
  async insertCheckin(c: WebCheckin) { this.checkins.push(c); }
  async nextReservationNumber() {
    let max = 20000;
    for (const c of this.clients) for (const r of c.reservas) max = Math.max(max, Number(r.codigo.replace(/\D/g, '')));
    return max + 1;
  }
}

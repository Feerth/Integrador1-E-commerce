/** Tipos que reflejan los documentos que guarda el programa de escritorio (MongoDB, base "skyairline"). */

export interface HistoryEntry {
  estado: string;
  fecha: string | null; // ISO local "2026-10-27T07:23:11"
  usuario?: string | null;
  punto?: string | null;
  observacion?: string | null;
}

export interface Baggage {
  codigo: string;
  pasajero: string;
  categoriaPeso: string;
  estado: string;
  observaciones?: string | null;
  historial: HistoryEntry[];
}

export interface SeatCategory {
  categoria: string;
  total: number;
  vendidos: number;
  cancelados: number;
}

export interface Passenger {
  nombre: string;
  asiento: string;
  categoriaAsiento: string;
}

export interface Flight {
  codigo: string;
  fecha: string; // yyyy-MM-dd
  horaSalida: string; // HH:mm
  horaLlegadaEstimada: string; // HH:mm
  origen: string;
  destino: string;
  capacidad: number;
  modeloAvion: string;
  matricula: string;
  estado: string;
  seatCategories: SeatCategory[];
  passengers: Passenger[];
  baggageItems: Baggage[];
  crew?: unknown[];
}

export interface Reservation {
  codigo: string;
  vueloCodigo: string;
  fecha: string;
  ruta: string;
  asiento: string;
  categoria: string;
  estado: string; // CONFIRMADA | COMPLETADA | CANCELADA
}

export interface Client {
  id: string;
  nombre: string;
  dni: string;
  correo: string;
  telefono: string;
  reservas: Reservation[];
}

/** Credenciales de la web. Van en una colección aparte para no interferir con "clients" del escritorio. */
export interface WebAccount {
  clientId: string;
  correo: string;
  passwordHash: string;
  creada: string;
}

export interface WebCheckin {
  reservaCodigo: string;
  clientId: string;
  fecha: string;
  puerta: string;
  grupo: string;
}

export interface FlightQuery {
  origen?: string;
  destino?: string;
  fecha?: string;
}

/**
 * Puertos de acceso a datos, separados por responsabilidad (Segregación de Interfaces, la "I" de SOLID).
 * Cada ruta de la API depende solo del puerto que necesita, no de un "Store" gigante.
 */

/** Vuelos y asientos. */
export interface FlightStore {
  searchFlights(q: FlightQuery): Promise<Flight[]>;
  getFlight(codigo: string): Promise<Flight | null>;
  listAirports(): Promise<string[]>;
  /** Suma un pasajero al vuelo y un asiento vendido a la categoría (lo ve el personal en el escritorio). */
  bookSeat(vueloCodigo: string, p: Passenger): Promise<void>;
}

/** Clientes y sus reservas (colección "clients", compartida con el escritorio). */
export interface ClientStore {
  findClientByDni(dni: string): Promise<Client | null>;
  findClientById(id: string): Promise<Client | null>;
  insertClient(c: Omit<Client, 'id'>): Promise<Client>;
  addReservation(clientId: string, r: Reservation): Promise<void>;
  nextReservationNumber(): Promise<number>;
}

/** Equipaje (vive dentro de cada vuelo en el escritorio). */
export interface BaggageStore {
  findBaggage(codigo: string): Promise<{ baggage: Baggage; flight: Flight } | null>;
  findBaggageByPassenger(nombre: string): Promise<{ baggage: Baggage; flight: Flight }[]>;
}

/** Credenciales web (colección "web_accounts"). */
export interface AccountStore {
  findAccountByEmail(correo: string): Promise<WebAccount | null>;
  findAccountByClientId(clientId: string): Promise<WebAccount | null>;
  insertAccount(a: WebAccount): Promise<void>;
}

/** Check-in en línea (colección "web_checkins"). */
export interface CheckinStore {
  findCheckin(reservaCodigo: string): Promise<WebCheckin | null>;
  insertCheckin(c: WebCheckin): Promise<void>;
}

/** Composición de todos los puertos. Hay una implementación para MongoDB y otra "demo" en memoria. */
export interface Store extends FlightStore, ClientStore, BaggageStore, AccountStore, CheckinStore {
  readonly mode: 'mongo' | 'demo';
}

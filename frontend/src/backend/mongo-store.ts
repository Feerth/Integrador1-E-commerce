import { MongoClient, ObjectId, type Db, type Document } from 'mongodb';
import type { Baggage, Client, Flight, FlightQuery, Passenger, Reservation, Store, WebAccount, WebCheckin } from './types';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LIGHT = { passengers: 0, baggageItems: 0, crew: 0 }; // proyección para listados

function toFlight(d: Document): Flight {
  const { _id, ...rest } = d;
  return { ...(rest as Flight), passengers: rest['passengers'] ?? [], baggageItems: rest['baggageItems'] ?? [], seatCategories: rest['seatCategories'] ?? [] };
}

function toClient(d: Document): Client {
  return {
    id: String(d['_id']),
    nombre: d['nombre'],
    dni: d['dni'],
    correo: d['correo'],
    telefono: d['telefono'],
    reservas: d['reservas'] ?? [],
  };
}

export class MongoStore implements Store {
  readonly mode = 'mongo' as const;

  private constructor(private readonly client: MongoClient, private readonly db: Db) {}

  /** Conecta a la MISMA base de datos que usa el programa de escritorio. Lanza si Mongo no responde. */
  static async connect(uri: string, dbName: string): Promise<MongoStore> {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    const db = client.db(dbName);
    await db.command({ ping: 1 });
    await db.collection('web_accounts').createIndex({ correo: 1 }, { unique: true });
    return new MongoStore(client, db);
  }

  async searchFlights(q: FlightQuery): Promise<Flight[]> {
    const filter: Document = {};
    if (q.origen) filter['origen'] = { $regex: escapeRegex(q.origen), $options: 'i' };
    if (q.destino) filter['destino'] = { $regex: escapeRegex(q.destino), $options: 'i' };
    if (q.fecha) filter['fecha'] = q.fecha;
    const docs = await this.db.collection('flights').find(filter, { projection: LIGHT }).sort({ fecha: 1, horaSalida: 1 }).limit(200).toArray();
    return docs.map(toFlight);
  }

  async getFlight(codigo: string): Promise<Flight | null> {
    const d = await this.db.collection('flights').findOne({ codigo });
    return d ? toFlight(d) : null;
  }

  async listAirports(): Promise<string[]> {
    const col = this.db.collection('flights');
    const [o, d] = await Promise.all([col.distinct('origen'), col.distinct('destino')]);
    return [...new Set([...o, ...d])].sort((a, b) => a.localeCompare(b, 'es'));
  }

  async findBaggage(codigo: string) {
    const d = await this.db.collection('flights').findOne({ 'baggageItems.codigo': codigo });
    if (!d) return null;
    const flight = toFlight(d);
    const baggage = flight.baggageItems.find((b) => b.codigo === codigo) as Baggage;
    return { baggage, flight };
  }

  async findBaggageByPassenger(nombre: string) {
    const docs = await this.db.collection('flights').find({ 'baggageItems.pasajero': nombre }).toArray();
    const out: { baggage: Baggage; flight: Flight }[] = [];
    for (const d of docs) {
      const flight = toFlight(d);
      for (const baggage of flight.baggageItems) if (baggage.pasajero === nombre) out.push({ baggage, flight });
    }
    return out;
  }

  async findClientByDni(dni: string) {
    const d = await this.db.collection('clients').findOne({ dni });
    return d ? toClient(d) : null;
  }

  async findClientById(id: string) {
    if (!ObjectId.isValid(id)) return null;
    const d = await this.db.collection('clients').findOne({ _id: new ObjectId(id) });
    return d ? toClient(d) : null;
  }

  async insertClient(c: Omit<Client, 'id'>): Promise<Client> {
    const r = await this.db.collection('clients').insertOne({ ...c });
    return { ...c, id: r.insertedId.toHexString() };
  }

  async addReservation(clientId: string, r: Reservation) {
    await this.db.collection('clients').updateOne({ _id: new ObjectId(clientId) }, { $push: { reservas: r } as never });
  }

  async findAccountByEmail(correo: string) {
    return (await this.db.collection('web_accounts').findOne({ correo: correo.toLowerCase() })) as unknown as WebAccount | null;
  }

  async findAccountByClientId(clientId: string) {
    return (await this.db.collection('web_accounts').findOne({ clientId })) as unknown as WebAccount | null;
  }

  async insertAccount(a: WebAccount) {
    await this.db.collection('web_accounts').insertOne({ ...a, correo: a.correo.toLowerCase() });
  }

  async bookSeat(vueloCodigo: string, p: Passenger) {
    await this.db.collection('flights').updateOne(
      { codigo: vueloCodigo },
      { $push: { passengers: p } as never, $inc: { 'seatCategories.$[c].vendidos': 1 } },
      { arrayFilters: [{ 'c.categoria': p.categoriaAsiento }] },
    );
  }

  async findCheckin(reservaCodigo: string) {
    return (await this.db.collection('web_checkins').findOne({ reservaCodigo })) as unknown as WebCheckin | null;
  }

  async insertCheckin(c: WebCheckin) {
    await this.db.collection('web_checkins').insertOne({ ...c });
  }

  async nextReservationNumber() {
    const docs = await this.db.collection('clients').find({}, { projection: { 'reservas.codigo': 1 } }).toArray();
    let max = 20000;
    for (const d of docs) for (const r of d['reservas'] ?? []) {
      const n = Number(String(r.codigo).replace(/\D/g, ''));
      if (n > max) max = n;
    }
    return max + 1;
  }
}

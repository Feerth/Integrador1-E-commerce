
import express, { type NextFunction, type Request, type Response, Router } from 'express';
import { createToken, hashPassword, readToken, verifyPassword } from './auth';
import { log } from './logger';
import { LoginRateLimiter } from './rate-limiter';
import type { Baggage, Client, Flight, Reservation, Store } from './types';

/** Tarifas referenciales por categoría (el modelo del escritorio no guarda precios). Sin pasarela de pago real. */
export const TARIFAS: Record<string, number> = {
  'Económico': 129,
  'Económico Premium': 219,
  'Business': 389
};

/** Filas por categoría para asignar asiento automáticamente (A–F). */
const FILAS: Record<string, [number, number, string]> = {
  'Business': [1, 3, 'ABCD'],
  'Económico Premium': [4, 8, 'ABCDEF'],
  'Económico': [9, 40, 'ABCDEF'],
};

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const str = (v: unknown, max = 120) =>
  (typeof v === 'string' ? v.trim().slice(0, max) : '');

const departure = (f: { fecha: string; horaSalida: string }) =>
  new Date(`${f.fecha}T${f.horaSalida}:00`);

const maskName = (n: string) => {
  const p = n.split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[1][0]}.` : p[0];
};

const publicClient = (c: Client) => ({
  id: c.id,
  nombre: c.nombre,
  dni: c.dni,
  correo: c.correo,
  telefono: c.telefono
});

function flightView(f: Flight) {
  const categorias = f.seatCategories.map((c) => ({
    categoria: c.categoria,
    disponibles: Math.max(c.total - c.vendidos - c.cancelados, 0),
    precio: TARIFAS[c.categoria] ?? null,
  }));

  const abierto =
    ['ACTIVO', 'RETRASADO'].includes(f.estado) &&
    departure(f).getTime() > Date.now();

  return {
    codigo: f.codigo,
    fecha: f.fecha,
    horaSalida: f.horaSalida,
    horaLlegadaEstimada: f.horaLlegadaEstimada,
    origen: f.origen,
    destino: f.destino,
    estado: f.estado,
    modeloAvion: f.modeloAvion,
    categorias,
    reservable: abierto && categorias.some((c) => c.disponibles > 0),
  };
}

function checkinWindow(f: Flight) {
  const ms = departure(f).getTime() - Date.now();
  const H = 3600_000;

  if (ms > 48 * H) {
    return {
      abierto: false,
      motivo: 'El check-in abre 48 horas antes de la salida.'
    };
  }

  if (ms < 2 * H) {
    return {
      abierto: false,
      motivo: 'El check-in en línea cierra 2 horas antes de la salida.'
    };
  }

  return { abierto: true, motivo: null };
}

function baggageView(b: Baggage, f: Flight, full: boolean) {
  return {
    codigo: b.codigo,
    pasajero: full ? b.pasajero : maskName(b.pasajero),
    categoriaPeso: b.categoriaPeso,
    estado: b.estado,
    observaciones: b.observaciones ?? null,
    vuelo: {
      codigo: f.codigo,
      origen: f.origen,
      destino: f.destino,
      fecha: f.fecha,
      horaSalida: f.horaSalida,
      horaLlegadaEstimada: f.horaLlegadaEstimada,
      estado: f.estado
    },
    // No se expone el nombre del operador que registró cada movimiento.
    historial: (b.historial ?? []).map((h) => ({
      estado: h.estado,
      fecha: h.fecha,
      punto: h.punto ?? null,
      observacion: h.observacion ?? null
    })),
  };
}

export function createApi(
  store: Store,
  limiter: LoginRateLimiter = new LoginRateLimiter()
): Router {
  const api = Router();

  api.use(express.json({ limit: '20kb' }));

  const auth = async (
    req: Request & { client?: Client },
    _res: Response,
    next: NextFunction
  ) => {
    const id = readToken(
      req.headers.authorization?.replace(/^Bearer\s+/i, '')
    );

    const client = id ? await store.findClientById(id) : null;

    if (!client) {
      throw new HttpError(401, 'Inicia sesión para continuar.');
    }

    req.client = client;
    next();
  };

  type AuthReq = Request & { client: Client };

  api.get('/health', (_req, res) =>
    res.json({ ok: true, modo: store.mode })
  );

  api.get('/airports', async (_req, res) =>
    res.json(await store.listAirports())
  );

  // ---------- Vuelos ----------
  api.get('/flights', async (req, res) => {
    const fecha = str(req.query['fecha'], 10);

    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new HttpError(400, 'Fecha inválida.');
    }

    const flights = await store.searchFlights({
      origen: str(req.query['origen']),
      destino: str(req.query['destino']),
      fecha
    });

    res.json(flights.map(flightView));
  });

  // ---------- Cuenta ----------
  api.post('/auth/register', async (req, res) => {
    const nombre = str(req.body?.nombre);
    const dni = str(req.body?.dni, 12);
    const correo = str(req.body?.correo).toLowerCase();
    const telefono = str(req.body?.telefono, 20);
    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';

    // Validar nombre completo
    if (nombre.length < 3) {
      throw new HttpError(400, 'Ingresa tu nombre completo.');
    }

    // Validar DNI: exactamente 8 dígitos numéricos
    if (!/^\d{8}$/.test(dni)) {
      throw new HttpError(400, 'El DNI debe tener 8 dígitos.');
    }

    // Validar teléfono: exactamente 9 dígitos numéricos
    if (!/^\d{9}$/.test(telefono)) {
      throw new HttpError(
        400,
        'El teléfono debe tener exactamente 9 dígitos numéricos.'
      );
    }

    // Validar correo electrónico
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      throw new HttpError(400, 'Correo electrónico inválido.');
    }

    // Validar contraseña
    if (password.length < 6) {
      throw new HttpError(
        400,
        'La contraseña debe tener al menos 6 caracteres.'
      );
    }

    // Comprobar si ya existe una cuenta con ese correo
    if (await store.findAccountByEmail(correo)) {
      throw new HttpError(
        409,
        'Ya existe una cuenta con ese correo.'
      );
    }

    // Si el DNI ya existe en el sistema (cliente creado por el personal),
    // se vincula la cuenta a ese cliente solo si el correo coincide.
    // Así se evita que alguien vea reservas ajenas con solo conocer un DNI.
    let client = await store.findClientByDni(dni);

    if (client) {
      if (client.correo.toLowerCase() !== correo) {
        throw new HttpError(
          409,
          'Ese DNI ya está registrado con otro correo. Usa el correo con el que compraste tus pasajes.'
        );
      }

      if (await store.findAccountByClientId(client.id)) {
        throw new HttpError(
          409,
          'Ese cliente ya tiene una cuenta web. Inicia sesión.'
        );
      }
    } else {
      client = await store.insertClient({
        nombre,
        dni,
        correo,
        telefono,
        reservas: []
      });
    }

    await store.insertAccount({
      clientId: client.id,
      correo,
      passwordHash: hashPassword(password),
      creada: new Date().toISOString()
    });

    res.status(201).json({
      token: createToken(client.id),
      cliente: publicClient(client)
    });
  });

  // ---------- Inicio de sesión ----------
  api.post('/auth/login', async (req, res) => {
    const correo = str(req.body?.correo).toLowerCase();

    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';

    const key = `${req.ip ?? 'ip'}|${correo}`;

    const wait = limiter.retryAfterSeconds(key);

    if (wait > 0) {
      log.warn(
        `Login bloqueado por demasiados intentos (${correo || 'sin correo'}, ip ${req.ip}).`
      );

      res.set('Retry-After', String(wait));

      throw new HttpError(
        429,
        `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(wait / 60)} min.`
      );
    }

    const account = correo
      ? await store.findAccountByEmail(correo)
      : null;

    const client =
      account && verifyPassword(password, account.passwordHash)
        ? await store.findClientById(account.clientId)
        : null;

    if (!client) {
      limiter.registerFailure(key);

      log.warn(
        `Login fallido para "${correo || 'sin correo'}" desde ${req.ip}.`
      );

      throw new HttpError(
        401,
        'Correo o contraseña incorrectos.'
      );
    }

    limiter.registerSuccess(key);

    log.info(`Login correcto: cliente ${client.id}.`);

    res.json({
      token: createToken(client.id),
      cliente: publicClient(client)
    });
  });

  api.get('/auth/me', auth as never, (req, res) =>
    res.json(publicClient((req as AuthReq).client))
  );

  // ---------- Reservas ----------
  api.post('/bookings', auth as never, async (req, res) => {
    const client = (req as AuthReq).client;

    const vueloCodigo = str(req.body?.vueloCodigo, 20);
    const categoria = str(req.body?.categoria, 40);

    const flight = await store.getFlight(vueloCodigo);

    if (!flight) {
      throw new HttpError(404, 'Vuelo no encontrado.');
    }

    const view = flightView(flight);

    if (!view.reservable) {
      throw new HttpError(
        409,
        'Este vuelo ya no está disponible para reservas.'
      );
    }

    const cat = view.categorias.find(
      (c) => c.categoria === categoria
    );

    if (!cat) {
      throw new HttpError(400, 'Categoría inválida.');
    }

    if (cat.disponibles < 1) {
      throw new HttpError(
        409,
        'No quedan asientos en esa categoría.'
      );
    }

    if (
      client.reservas.some(
        (r) =>
          r.vueloCodigo === flight.codigo &&
          r.estado === 'CONFIRMADA'
      )
    ) {
      throw new HttpError(
        409,
        'Ya tienes una reserva confirmada en este vuelo.'
      );
    }

    const [fromRow, toRow, letters] =
      FILAS[categoria] ?? FILAS['Económico'];

    const taken = new Set(
      flight.passengers.map((p) => p.asiento)
    );

    let asiento = '';

    outer:
    for (let row = fromRow; row <= toRow; row++) {
      for (const l of letters) {
        if (!taken.has(`${row}${l}`)) {
          asiento = `${row}${l}`;
          break outer;
        }
      }
    }

    if (!asiento) {
      throw new HttpError(
        409,
        'No quedan asientos en esa categoría.'
      );
    }

    const numero = await store.nextReservationNumber();

    const reserva: Reservation = {
      codigo: `RES-${numero}`,
      vueloCodigo: flight.codigo,
      fecha: flight.fecha,
      ruta: `${flight.origen.replace(/\s*\(.*\)/, '')} → ${flight.destino.replace(/\s*\(.*\)/, '')}`,
      asiento,
      categoria,
      estado: 'CONFIRMADA',
    };

    await store.addReservation(client.id, reserva);

    await store.bookSeat(flight.codigo, {
      nombre: client.nombre,
      asiento,
      categoriaAsiento: categoria
    });

    res.status(201).json({
      reserva,
      precio: cat.precio
    });
  });

  api.get('/me/trips', auth as never, async (req, res) => {
    const client = (
      await store.findClientById((req as AuthReq).client.id)
    ) as Client;

    const trips = [];

    for (const r of client.reservas) {
      const flight = await store.getFlight(r.vueloCodigo);
      const checkin = await store.findCheckin(r.codigo);

      const ventana = flight
        ? checkinWindow(flight)
        : { abierto: false, motivo: null };

      trips.push({
        ...r,
        vuelo: flight ? flightView(flight) : null,
        checkin,
        checkinAbierto:
          r.estado === 'CONFIRMADA' &&
          !checkin &&
          ventana.abierto &&
          !!flight &&
          ['ACTIVO', 'RETRASADO'].includes(flight.estado),
        checkinMotivo: checkin
          ? 'Check-in realizado.'
          : r.estado !== 'CONFIRMADA'
            ? 'La reserva no está confirmada.'
            : ventana.motivo,
      });
    }

    trips.sort((a, b) =>
      (b.fecha + (b.vuelo?.horaSalida ?? '')).localeCompare(
        a.fecha + (a.vuelo?.horaSalida ?? '')
      )
    );

    res.json(trips);
  });

  // ---------- Check-in ----------
  api.post('/checkin', auth as never, async (req, res) => {
    const client = (req as AuthReq).client;
    const codigo = str(req.body?.reservaCodigo, 20);

    const reserva = client.reservas.find(
      (r) => r.codigo === codigo
    );

    if (!reserva) {
      throw new HttpError(404, 'Reserva no encontrada.');
    }

    if (reserva.estado !== 'CONFIRMADA') {
      throw new HttpError(
        409,
        'Solo se puede hacer check-in de reservas confirmadas.'
      );
    }

    const flight = await store.getFlight(reserva.vueloCodigo);

    if (
      !flight ||
      !['ACTIVO', 'RETRASADO'].includes(flight.estado)
    ) {
      throw new HttpError(
        409,
        'El vuelo no admite check-in.'
      );
    }

    const w = checkinWindow(flight);

    if (!w.abierto) {
      throw new HttpError(409, w.motivo as string);
    }

    if (await store.findCheckin(codigo)) {
      throw new HttpError(
        409,
        'Ya hiciste el check-in de esta reserva.'
      );
    }

    const n = [...codigo].reduce(
      (a, c) => a + c.charCodeAt(0),
      0
    );

    const checkin = {
      reservaCodigo: codigo,
      clientId: client.id,
      fecha: new Date().toISOString(),
      puerta: `${'ABC'[n % 3]}${1 + (n % 12)}`,
      grupo:
        reserva.categoria === 'Business'
          ? '1'
          : reserva.categoria === 'Económico Premium'
            ? '2'
            : '3',
    };

    await store.insertCheckin(checkin);

    res.status(201).json(checkin);
  });

  // ---------- Rastreo de equipaje ----------
  api.get('/baggage/:codigo', async (req, res) => {
    const codigo = str(req.params['codigo'], 20).toUpperCase();

    if (!/^EQ-\d{3,8}$/.test(codigo)) {
      throw new HttpError(
        400,
        'El código de equipaje tiene el formato EQ-00000.'
      );
    }

    const found = await store.findBaggage(codigo);

    if (!found) {
      throw new HttpError(
        404,
        'No encontramos un equipaje con ese código.'
      );
    }

    res.json(
      baggageView(found.baggage, found.flight, false)
    );
  });

  api.get('/me/baggage', auth as never, async (req, res) => {
    const found = await store.findBaggageByPassenger(
      (req as AuthReq).client.nombre
    );

    res.json(
      found.map((x) =>
        baggageView(x.baggage, x.flight, true)
      )
    );
  });

  // ---------- Errores ----------
  api.use('/{*splat}', (_req, _res) => {
    throw new HttpError(404, 'Ruta no encontrada.');
  });

  api.use((
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (err instanceof HttpError) {
      return void res.status(err.status).json({
        error: err.message
      });
    }

    log.error(
      `Error no controlado en ${_req.method} ${_req.originalUrl}`,
      err
    );

    res.status(500).json({
      error: 'Error interno del servidor.'
    });
  });

  return api;
}

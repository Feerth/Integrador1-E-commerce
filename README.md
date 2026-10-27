# SKY Airline — Web del cliente (Angular + Express)

Web para **clientes**; el programa de escritorio (`skyairline-desktop`) es para el **personal**.
Ambos usan la **misma base MongoDB `skyairline`**:

| Web (cliente) | Escritorio (personal) |
|---|---|
| Rastreo de equipaje: lee `flights.baggageItems[].estado/historial` | Módulo Equipaje: cambia estado y registra historial |
| Buscar vuelos, estado y asientos libres | Módulos Vuelos y Asientos |
| Reservar: agrega reserva al cliente y pasajero al vuelo (+1 asiento vendido) | Clientes (reservas), Pasajeros, Asientos |
| Registro: crea (o vincula por DNI+correo) un cliente en `clients` | Módulo Clientes |
| Check-in / pase de abordar | colección `web_checkins` |

Las contraseñas web van en la colección `web_accounts` (hash scrypt), separada de `clients`, para no romper el CRUD del escritorio.

## Ejecutar
1. Inicia MongoDB y abre **una vez** el programa de escritorio (crea los datos de ejemplo).
2. En `frontend`:
```bash
pnpm install
pnpm start        # desarrollo: http://localhost:4200
pnpm build && node dist/frontend/server/server.mjs   # producción: http://localhost:4000
```
Variables opcionales: `MONGO_URI` (def. `mongodb://localhost:27017`), `MONGO_DB` (def. `skyairline`), `SKY_WEB_SECRET`, `PORT`.
Si Mongo no responde, arranca en **modo demo** (datos en memoria, no compartidos). `SKY_DEMO=1` lo fuerza.

## Prueba rápida
- Registro con un cliente del escritorio: DNI `45123789` + correo `jramos@gmail.com`.
- Rastreo: `EQ-00142`, `EQ-00203`, `EQ-00303`; cambia un estado en el escritorio y la web lo refleja (cada 30 s).
- Check-in: ventana de 48 h a 2 h antes de la salida.

Páginas: `/trip/home`, `/trip/flights`, `/trip/my-trips`, `/trip/check-in`, `/trip/baggage-tracking`, `/trip/help`, `/auth/login`, `/auth/register`.
Backend: `src/server.ts` + `src/backend/`. Para otro dominio agrégalo en `security.allowedHosts` de `angular.json`.

## Pruebas (TDD)
```bash
cd frontend
pnpm test:backend   # Vitest: login, límite de intentos, registro, endpoints, HTTPS (20 pruebas)
```
Las pruebas del backend están en `src/backend/*.spec.ts` y usan el almacén demo en memoria (no necesitan MongoDB).

## Seguridad
- **Límite de intentos de login**: 5 fallos por IP+correo bloquean 15 min (HTTP 429 + `Retry-After`). Ver `src/backend/rate-limiter.ts`.
- **Logs**: errores y logins fallidos/bloqueados se registran con nivel y hora (`LOG_LEVEL=debug|info|warn|error`). La URI de Mongo nunca se imprime.
- **HTTPS**: al publicar detrás de un hosting/proxy con TLS, usa `FORCE_HTTPS=1` (redirige HTTP→HTTPS y envía HSTS). `TRUST_PROXY` (def. 1) para que la IP del cliente sea la real.
- **Credenciales de MongoDB**: solo por variable de entorno `MONGO_URI` (p. ej. `mongodb+srv://usuario:clave@cluster/...`); no hay credenciales en el código. Configura también `SKY_WEB_SECRET` con un valor largo y aleatorio en producción.
- Cabeceras `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`; contraseñas con scrypt + salt.

## Arquitectura del backend (SOLID)
`src/backend/types.ts` separa el acceso a datos en puertos pequeños (**Segregación de Interfaces**): `FlightStore`, `ClientStore`, `BaggageStore`, `AccountStore`, `CheckinStore`. `Store` solo los compone; `MongoStore` y `DemoStore` son intercambiables (**Sustitución de Liskov / Inversión de dependencias**: la API depende de la abstracción).

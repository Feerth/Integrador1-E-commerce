import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { createApi, createStore } from './backend';
import { httpsRedirect, securityHeaders } from './backend/security';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Detrás de un proxy (hosting con HTTPS) para que req.ip y req.secure sean los reales.
app.set('trust proxy', process.env['TRUST_PROXY'] ?? 1);
app.disable('x-powered-by');
app.use(httpsRedirect());
app.use(securityHeaders);

/**
 * API REST de la web. Lee y escribe en la MISMA base MongoDB del programa de escritorio
 * (o en modo demo en memoria si Mongo no está disponible). Ver src/backend/.
 */
const apiRouter = createStore().then(createApi);
app.use('/api', (req, res, next) => {
  apiRouter.then((router) => router(req, res, next)).catch(next);
});


/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

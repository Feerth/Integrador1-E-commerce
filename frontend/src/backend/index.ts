import { log } from './logger';
import { DemoStore } from './demo-store';
import { MongoStore } from './mongo-store';
import type { Store } from './types';

/** Conecta a la MongoDB del programa de escritorio; si no responde, cae al modo demo (en memoria). */
export async function createStore(): Promise<Store> {
  if (process.env['SKY_DEMO'] === '1') {
    log.warn('Modo DEMO (SKY_DEMO=1): datos en memoria, no se usa MongoDB.');
    return new DemoStore();
  }
  const uri = process.env['MONGO_URI'] || 'mongodb://localhost:27017';
  const db = process.env['MONGO_DB'] || 'skyairline';
  try {
    const store = await MongoStore.connect(uri, db);
    log.info(`Conectado a MongoDB (base "${db}"): la web comparte datos con el programa de escritorio.`);
    return store;
  } catch (e) {
    log.error('No se pudo conectar a MongoDB. Usando datos DEMO en memoria.', (e as Error).message);
    return new DemoStore();
  }
}
export { createApi } from './api';

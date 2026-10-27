/** Logger mínimo con niveles y marca de tiempo (sin dependencias). Nivel con LOG_LEVEL=debug|info|warn|error. */
type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  return ORDER[(process.env['LOG_LEVEL'] as Level) ?? 'info'] ?? ORDER.info;
}

function write(level: Level, msg: string, meta?: unknown): void {
  if (ORDER[level] < threshold()) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [SKY] ${msg}`;
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  meta === undefined ? out(line) : out(line, meta);
}

export const log = {
  debug: (m: string, meta?: unknown) => write('debug', m, meta),
  info: (m: string, meta?: unknown) => write('info', m, meta),
  warn: (m: string, meta?: unknown) => write('warn', m, meta),
  error: (m: string, meta?: unknown) => write('error', m, meta),
};

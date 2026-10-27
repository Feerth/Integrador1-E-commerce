import type { NextFunction, Request, Response } from 'express';

/**
 * HTTPS en producción: la web corre detrás de un proxy/hosting que termina TLS (Render, Railway, Nginx, Caddy...).
 * Con FORCE_HTTPS=1 redirige HTTP → HTTPS (según X-Forwarded-Proto) y activa HSTS.
 */
export function httpsRedirect(force = process.env['FORCE_HTTPS'] === '1') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!force) return next();
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      return next();
    }
    res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  };
}

/** Cabeceras de seguridad básicas (equivalente reducido a helmet, sin dependencias nuevas). */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

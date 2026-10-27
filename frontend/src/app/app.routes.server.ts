import { RenderMode, ServerRoute } from '@angular/ssr';

// Las páginas dependen de la sesión y de datos en vivo (vuelos, equipaje): se renderizan en el navegador.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];

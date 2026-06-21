// El juego se sirve bajo la subcarpeta /ajedrez del dominio del hub. Next prefija
// solo <Link>, router, next/image y los assets, PERO NO los fetch ni los
// EventSource a rutas absolutas. Por eso toda llamada del navegador a una ruta
// interna (API o archivo público) debe pasar por `ruta()`.
//
// Debe coincidir con `basePath` de next.config.js.
export const BASE_PATH = '/ajedrez';

/** Prefija una ruta interna (API o asset público) con el basePath del juego. */
export function ruta(p: string): string {
  return `${BASE_PATH}${p.startsWith('/') ? p : `/${p}`}`;
}

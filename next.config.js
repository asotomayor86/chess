/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // El juego se sirve bajo el dominio del hub en la subcarpeta /ajedrez
  // (gamehub.family/ajedrez/...). basePath hace que Next emita sus assets
  // (/ajedrez/_next/...) y enrute sus páginas bajo ese prefijo. Las llamadas
  // fetch/EventSource internas se prefijan a mano con lib/rutas (basePath no las
  // toca). trailingSlash casa con el hub para no provocar bucles de redirección.
  basePath: '/ajedrez',
  trailingSlash: true,
  // El rewrite del hub (/ajedrez/:path*) NO conserva la barra final al capturar el
  // subpath, así que nos llega "/ajedrez/acceso" (sin barra). Con trailingSlash a
  // secas, Next respondería 308 para añadir la barra y, como el hub la vuelve a
  // quitar, se forma un bucle. Desactivamos ESE redirect (pero mantenemos
  // trailingSlash para que los enlaces que generamos lleven barra).
  skipTrailingSlashRedirect: true,
  // Con basePath, la raíz pelada del dominio de Vercel (chess-xxx.vercel.app/)
  // no tiene página y da 404. Redirigimos esa raíz al juego para que quien entre
  // por el dominio directo (sin /ajedrez) acabe en la app. basePath:false hace que
  // el "source" sea la raíz real del dominio, no /ajedrez.
  async redirects() {
    return [
      { source: '/', destination: '/ajedrez', basePath: false, permanent: false },
    ];
  },
};

module.exports = nextConfig;

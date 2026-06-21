import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_USER, verificarUsuario } from '@/lib/hubUser';

export const config = {
  // Se ejecuta en todo salvo recursos internos de Next y el favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

// El acceso al juego es exclusivamente con cuenta del HUB (SSO). El middleware
// exige una cookie de identidad válida; sin ella, las páginas van a /acceso y las
// API responden 401. La pantalla de acceso, el endpoint de SSO y el área de admin
// (con su propia clave) quedan siempre abiertos.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Con trailingSlash el pathname llega como "/acceso/"; lo normalizamos sin la
  // barra final para comparar (si no, /acceso nunca casaría y se redirige en bucle).
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;

  if (path === '/acceso' || path === '/api/sso') {
    return NextResponse.next();
  }
  // /local es un tablero de prueba (hotseat) sin hub ni BD: queda siempre abierto.
  if (path === '/local') {
    return NextResponse.next();
  }
  if (path === '/admin' || path.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_USER)?.value;
  const usuario = await verificarUsuario(cookie);
  if (usuario) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'no-autorizado' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/acceso';
  url.searchParams.set('volver', pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

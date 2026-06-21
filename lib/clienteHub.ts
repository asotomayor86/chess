'use client';

// Cliente de navegador para el SSO con el HUB familiar. El login usa Neon Auth
// apuntando al PROXY de auth del hub, así las cuentas (email+contraseña) del hub
// valen aquí sin login propio. Tras iniciar sesión, el juego fija su propia cookie
// (aj_user) llamando a /api/sso.
import { createAuthClient } from '@neondatabase/auth';

/**
 * URL base del hub (sin barra final). En el NAVEGADOR el juego SIEMPRE se sirve
 * bajo el dominio del hub (gamehub.family/ajedrez), así que el hub es el MISMO
 * origen: usar window.location.origin evita CORS en el login (un login
 * cross-origin contra el dominio .vercel.app falla con "Failed to fetch"). En el
 * servidor (si se importara) cae a NEXT_PUBLIC_HUB_URL.
 */
export const HUB_URL = (
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_HUB_URL || 'https://gamehub.family'
).replace(/\/+$/, '');

const authClient = createAuthClient(`${HUB_URL}/api/auth`);

export interface UsuarioHub {
  id: string;
  name: string;
}

/** Inicia sesión con email+contraseña del hub. Devuelve { id, name } o lanza. */
export async function loginHub(email: string, password: string): Promise<UsuarioHub> {
  const res = await authClient.signIn.email({ email, password });
  if (res?.error) throw new Error(res.error.message || 'Email o contraseña incorrectos.');
  const user =
    res?.data?.user ??
    (res as { user?: { id?: string; name?: string; email?: string } })?.user;
  if (!user?.id) throw new Error('No se pudo iniciar sesión.');
  return { id: user.id, name: user.name || user.email || '' };
}

/** Cierra la sesión de Neon Auth (mejor esfuerzo). */
export async function logoutHub(): Promise<void> {
  try {
    await authClient.signOut();
  } catch {
    /* la cookie propia del juego se limpia aparte en /api/sso */
  }
}

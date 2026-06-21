// Identidad del jugador en el juego = cuenta del HUB (SSO).
//
// Tras iniciar sesión con Neon Auth (email+contraseña, verificado contra el hub),
// el cliente nos pasa su { id, name } y firmamos una cookie httpOnly con HMAC para
// que no se manipule entre peticiones. La pertenencia a la SALA se valida aparte
// contra el hub, y el resultado lo escribe el backend revalidando.
//
// Usa Web Crypto (disponible en el runtime Edge del middleware y en Node), así que
// las funciones son asíncronas. Sin Buffer: base64url manual con btoa/atob para
// funcionar igual en Edge y en Node.

export const COOKIE_USER = 'aj_user';
export const MAX_AGE_USER = 60 * 60 * 24 * 30; // 30 días

export interface HubUser {
  id: string;
  name: string;
}

function secreto(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.HUB_RESULT_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'dev-insecure-secret'
  );
}

function bytesAB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function strAB64url(str: string): string {
  return bytesAB64url(new TextEncoder().encode(str));
}

function b64urlAStr(b64: string): string {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmac(payload: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(payload));
  return bytesAB64url(new Uint8Array(firma));
}

/** Comparación de strings sin cortocircuito por longitud (mitiga timing). */
function igualSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

/** Firma { id, name } → "payload.firma" (base64url). */
export async function firmarUsuario(u: HubUser): Promise<string> {
  const payload = strAB64url(JSON.stringify({ id: u.id, name: u.name || '' }));
  return `${payload}.${await hmac(payload)}`;
}

/** Verifica el token de la cookie y devuelve { id, name } o null si no es válido. */
export async function verificarUsuario(
  token: string | undefined | null,
): Promise<HubUser | null> {
  if (!token || !token.includes('.')) return null;
  const [payload, firma] = token.split('.');
  if (!igualSeguro(firma, await hmac(payload))) return null;
  try {
    const data = JSON.parse(b64urlAStr(payload)) as { id?: string; name?: string };
    return data.id ? { id: data.id, name: data.name || '' } : null;
  } catch {
    return null;
  }
}

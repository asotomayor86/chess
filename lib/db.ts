import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Cliente Neon (HTTP). Solo debe usarse en código de servidor (API routes,
 * middleware). La cadena de conexión es secreta y nunca debe llegar al navegador.
 *
 * Vercel inyecta `DATABASE_URL` automáticamente al crear una base de datos Neon
 * desde Storage. En local se define en `.env.local`.
 *
 * Se inicializa de forma perezosa para no romper el build si la variable aún no
 * está definida en tiempo de compilación.
 */
let cliente: NeonQueryFunction<false, false> | null = null;

export function sql(): NeonQueryFunction<false, false> {
  if (cliente) return cliente;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL no está definida.');
  }
  // `cache: 'no-store'` evita que Next.js cachee el fetch interno del driver:
  // sin esto, las consultas SELECT idénticas devuelven resultados obsoletos.
  cliente = neon(url, { fetchOptions: { cache: 'no-store' } });
  return cliente;
}

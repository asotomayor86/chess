import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function autorizado(req: Request): boolean {
  const esperado = process.env.ADMIN_PASSWORD;
  if (!esperado) return false;
  return req.headers.get('x-admin-password') === esperado;
}

// Crea la tabla `partidas` en Neon usando la DATABASE_URL del runtime (que en
// Vercel no se puede leer en local porque es "sensible"). Idempotente y protegido
// por ADMIN_PASSWORD: se llama una sola vez tras el despliegue, equivale a
// `npm run db:init`.
export async function POST(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  try {
    await sql()`
      create table if not exists partidas (
        codigo     text primary key,
        estado     jsonb not null,
        version    integer not null default 0,
        updated_at timestamptz not null default now()
      )
    `;
    const cols = await sql()`
      select column_name from information_schema.columns
      where table_name = 'partidas' order by ordinal_position
    `;
    return NextResponse.json({
      ok: true,
      tabla: 'partidas',
      columnas: (cols as { column_name: string }[]).map((c) => c.column_name),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

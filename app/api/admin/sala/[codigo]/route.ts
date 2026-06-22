import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function autorizado(req: Request): boolean {
  const esperado = process.env.ADMIN_PASSWORD;
  if (!esperado) return false;
  return req.headers.get('x-admin-password') === esperado;
}

// Diagnóstico: vuelca la fila `partidas` de una sala (estado + version) para
// depurar el flujo de unión/sincronización. Protegido por ADMIN_PASSWORD.
export async function GET(req: Request, { params }: { params: { codigo: string } }) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const codigo = (params.codigo ?? '').toUpperCase();
  try {
    const filas = await sql()`
      select estado, version, updated_at from partidas where codigo = ${codigo}
    `;
    if (filas.length === 0) {
      return NextResponse.json({ existe: false });
    }
    return NextResponse.json({ existe: true, ...filas[0] });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

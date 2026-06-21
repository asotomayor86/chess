import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizar(codigo: string): string | null {
  const c = (codigo ?? '').toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(c) ? c : null;
}

function autorizado(req: Request): boolean {
  const esperado = process.env.ADMIN_PASSWORD;
  if (!esperado) return false; // admin deshabilitado si no hay clave configurada
  return req.headers.get('x-admin-password') === esperado;
}

// Borra la fila de la partida (estado guardado) para poder reconfigurar una sala
// atascada. La sala del HUB no se toca; al reentrar, el anfitrión vuelve a elegir
// color y se crea una partida nueva.
export async function DELETE(req: Request, { params }: { params: { codigo: string } }) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const codigo = normalizar(params.codigo);
  if (!codigo) return NextResponse.json({ error: 'Código inválido.' }, { status: 400 });

  try {
    const filas = await sql()`delete from partidas where codigo = ${codigo} returning codigo`;
    return NextResponse.json({ ok: true, borrada: filas.length > 0 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Crea la fila de la partida (la hace el anfitrión al configurar). Si el código ya
// existe (carrera entre los dos jugadores, o reentrada), responde 409 y el cliente
// simplemente se une a la partida en curso.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { codigo?: unknown; estado?: unknown };
    const codigo = typeof body.codigo === 'string' ? body.codigo.toUpperCase() : '';
    const estado = body.estado;
    if (!codigo || !/^[A-Z0-9]{4,12}$/.test(codigo) || estado == null) {
      return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
    }

    const filas = await sql()`
      insert into partidas (codigo, estado)
      values (${codigo}, ${JSON.stringify(estado)}::jsonb)
      on conflict (codigo) do nothing
      returning codigo
    `;
    if (filas.length === 0) {
      return NextResponse.json({ error: 'El código de sala ya existe.' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, codigo });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

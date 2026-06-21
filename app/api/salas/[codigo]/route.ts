import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizar(codigo: string): string | null {
  const c = (codigo ?? '').toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(c) ? c : null;
}

export async function GET(_req: Request, { params }: { params: { codigo: string } }) {
  try {
    const codigo = normalizar(params.codigo);
    if (!codigo) return NextResponse.json({ error: 'Código inválido.' }, { status: 400 });

    const filas = await sql()`
      select estado, version from partidas where codigo = ${codigo}
    `;
    if (filas.length === 0) {
      return NextResponse.json({ error: 'no-existe' }, { status: 404 });
    }
    const fila = filas[0] as { estado: unknown; version: number };
    return NextResponse.json({ estado: fila.estado, version: fila.version });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, { params }: { params: { codigo: string } }) {
  try {
    const codigo = normalizar(params.codigo);
    if (!codigo) return NextResponse.json({ error: 'Código inválido.' }, { status: 400 });

    const body = (await req.json()) as { estado?: unknown };
    if (body.estado == null) {
      return NextResponse.json({ error: 'Falta el estado.' }, { status: 400 });
    }

    const filas = await sql()`
      update partidas
      set estado = ${JSON.stringify(body.estado)}::jsonb,
          version = version + 1,
          updated_at = now()
      where codigo = ${codigo}
      returning version
    `;
    if (filas.length === 0) {
      return NextResponse.json({ error: 'no-existe' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, version: (filas[0] as { version: number }).version });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

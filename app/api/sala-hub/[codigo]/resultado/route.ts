import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_USER, verificarUsuario } from '@/lib/hubUser';
import { sql } from '@/lib/db';
import type { EstadoPartida } from '@/lib/tipos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HUB = (
  process.env.NEXT_PUBLIC_HUB_URL || 'https://one-page-to-rule-them-all.vercel.app'
).replace(/\/+$/, '');

function normalizar(codigo: string): string | null {
  const c = (codigo ?? '').toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(c) ? c : null;
}

// Envía el resultado de la partida al hub (servidor a servidor, con el secreto
// compartido). Idempotente: solo envía si la partida ha terminado y aún no se había
// enviado; marca la partida para no repetir. El resultado se deriva del estado
// guardado (ganador + userIds), no de quien llama.
export async function POST(_req: Request, { params }: { params: { codigo: string } }) {
  try {
    const codigo = normalizar(params.codigo);
    if (!codigo) return NextResponse.json({ error: 'Código inválido.' }, { status: 400 });

    const usuario = await verificarUsuario(cookies().get(COOKIE_USER)?.value);
    if (!usuario) {
      return NextResponse.json({ error: 'Inicia sesión con tu cuenta.' }, { status: 401 });
    }

    const secret = process.env.HUB_RESULT_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: 'HUB_RESULT_SECRET no está configurado en el juego.' },
        { status: 500 },
      );
    }

    const filas = await sql()`select estado from partidas where codigo = ${codigo}`;
    if (filas.length === 0) {
      return NextResponse.json({ error: 'no-existe' }, { status: 404 });
    }
    const estado = (filas[0] as { estado: EstadoPartida }).estado;
    const serie = estado?.serie;
    if (!serie || serie.fase !== 'fin') {
      return NextResponse.json({ ok: true, omitido: 'partida-no-terminada' });
    }
    if (serie.resultadoEnviado) {
      return NextResponse.json({ ok: true, omitido: 'ya-enviado' });
    }

    const [id0, id1] = serie.userIds;
    const results = serie.empateSerie
      ? [
          { userId: id0, result: 'draw' },
          { userId: id1, result: 'draw' },
        ]
      : [
          { userId: id0, result: serie.ganadorSerie === 0 ? 'win' : 'loss' },
          { userId: id1, result: serie.ganadorSerie === 1 ? 'win' : 'loss' },
        ];

    const r = await fetch(`${HUB}/api/rooms/${encodeURIComponent(codigo)}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ kind: 'ranked', results }),
    });

    // 409 (sala ya cerrada) o 404 (ya no existe) ⇒ alguien ya envió el resultado:
    // lo tratamos como éxito y marcamos para no reintentar.
    const yaCerrada = r.status === 409 || r.status === 404;
    if (!r.ok && !yaCerrada) {
      const detalle = await r.text().catch(() => '');
      return NextResponse.json(
        { error: `El hub rechazó el resultado (${r.status}). ${detalle}`.trim() },
        { status: 502 },
      );
    }

    // Marca la partida como enviada (sin tocar el resto del estado).
    await sql()`
      update partidas
      set estado = jsonb_set(estado, '{serie,resultadoEnviado}', 'true'::jsonb),
          version = version + 1,
          updated_at = now()
      where codigo = ${codigo}
    `;

    return NextResponse.json({ ok: true, enviado: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

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

    // Reclamo ATÓMICO: marcamos resultadoEnviado=true en una sola sentencia, pero
    // SOLO si la partida ha terminado y aún no estaba enviado. Como los dos
    // navegadores (uno por jugador) disparan este envío a la vez al ver el fin, sin
    // esto ambos pasaban la comprobación y el resultado llegaba al hub dos veces
    // (victoria contada doble). Con el UPDATE condicional, solo UNA petición gana el
    // reclamo (devuelve fila); las demás reciben 0 filas y no reenvían.
    const reclamo = await sql()`
      update partidas
      set estado = jsonb_set(estado, '{serie,resultadoEnviado}', 'true'::jsonb),
          version = version + 1,
          updated_at = now()
      where codigo = ${codigo}
        and estado->'serie'->>'fase' = 'fin'
        and coalesce((estado->'serie'->>'resultadoEnviado')::boolean, false) = false
      returning estado
    `;
    if (reclamo.length === 0) {
      // No ganamos el reclamo: o la partida no ha terminado, o el otro jugador ya
      // lo envió. Distinguimos leyendo el estado actual (sin reenviar nada).
      const actual = await sql()`select estado from partidas where codigo = ${codigo}`;
      if (actual.length === 0) {
        return NextResponse.json({ error: 'no-existe' }, { status: 404 });
      }
      const e = (actual[0] as { estado: EstadoPartida }).estado;
      if (!e?.serie || e.serie.fase !== 'fin') {
        return NextResponse.json({ ok: true, omitido: 'partida-no-terminada' });
      }
      return NextResponse.json({ ok: true, omitido: 'ya-enviado' });
    }

    const estado = (reclamo[0] as { estado: EstadoPartida }).estado;
    const serie = estado.serie;
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
      // closeRoom: true cierra la sala al terminar la partida (es una sola
      // partida, no una serie). Sin esto el hub solo cerraría salas de liga/torneo.
      body: JSON.stringify({ kind: 'ranked', closeRoom: true, results }),
    });

    // 409 (sala ya cerrada) o 404 (ya no existe) ⇒ el resultado ya estaba puesto:
    // lo tratamos como éxito (dejamos el reclamo marcado, no reintentamos).
    const yaCerrada = r.status === 409 || r.status === 404;
    if (!r.ok && !yaCerrada) {
      // Falló de verdad: revertimos el reclamo para que se pueda reintentar.
      await sql()`
        update partidas
        set estado = jsonb_set(estado, '{serie,resultadoEnviado}', 'false'::jsonb),
            version = version + 1,
            updated_at = now()
        where codigo = ${codigo}
      `;
      const detalle = await r.text().catch(() => '');
      return NextResponse.json(
        { error: `El hub rechazó el resultado (${r.status}). ${detalle}`.trim() },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, enviado: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

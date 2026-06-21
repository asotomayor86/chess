import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_USER, verificarUsuario } from '@/lib/hubUser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HUB = (
  process.env.NEXT_PUBLIC_HUB_URL || 'https://one-page-to-rule-them-all.vercel.app'
).replace(/\/+$/, '');

function normalizar(codigo: string): string | null {
  const c = (codigo ?? '').toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(c) ? c : null;
}

interface JugadorHub {
  userId: string;
  name: string;
  role: string;
}

// Resuelve, para el jugador logueado, su asiento (0/1) en la sala del hub y los
// nombres de ambos jugadores. La identidad sale de la cookie firmada (no del
// código), y se valida que esté entre los jugadores de la sala.
export async function GET(_req: Request, { params }: { params: { codigo: string } }) {
  try {
    const codigo = normalizar(params.codigo);
    if (!codigo) return NextResponse.json({ error: 'Código inválido.' }, { status: 400 });

    const usuario = await verificarUsuario(cookies().get(COOKIE_USER)?.value);
    if (!usuario) {
      return NextResponse.json({ error: 'Inicia sesión con tu cuenta.' }, { status: 401 });
    }

    const r = await fetch(`${HUB}/api/rooms/${encodeURIComponent(codigo)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (r.status === 404) {
      return NextResponse.json(
        { error: 'Esta sala no existe en el hub o ya está cerrada.' },
        { status: 404 },
      );
    }
    if (!r.ok) {
      return NextResponse.json({ error: 'El hub no respondió.' }, { status: 502 });
    }
    const sala = (await r.json()) as { players?: JugadorHub[] };

    const jugadores = (sala.players ?? []).filter((p) => p.role === 'player');
    const idx = jugadores.findIndex((p) => p.userId === usuario.id);
    if (idx === -1 || idx > 1) {
      return NextResponse.json(
        { error: 'No estás entre los jugadores de esta sala.' },
        { status: 403 },
      );
    }
    const dos = jugadores.slice(0, 2);
    return NextResponse.json({
      miIndice: idx,
      jugadores: [dos[0]?.name || 'Jugador 1', dos[1]?.name || 'Jugador 2'],
      userIds: [dos[0]?.userId || '', dos[1]?.userId || ''],
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

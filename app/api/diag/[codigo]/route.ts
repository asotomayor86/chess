import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_USER, verificarUsuario } from '@/lib/hubUser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HUB = (
  process.env.NEXT_PUBLIC_HUB_URL || 'https://one-page-to-rule-them-all.vercel.app'
).replace(/\/+$/, '');

// Diagnóstico de asiento: dice con qué identidad te ve el servidor (según TU
// cookie) y qué asiento te toca en la sala. Sirve para detectar si dos pantallas
// están usando la misma cuenta (misma cookie) → los dos saldrían en el mismo
// asiento y nadie configuraría.
export async function GET(_req: Request, { params }: { params: { codigo: string } }) {
  const codigo = (params.codigo ?? '').toUpperCase();
  const usuario = await verificarUsuario(cookies().get(COOKIE_USER)?.value);
  if (!usuario) {
    return NextResponse.json({ error: 'No hay sesión en esta pantalla.' }, { status: 401 });
  }

  const r = await fetch(`${HUB}/api/rooms/${encodeURIComponent(codigo)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!r.ok) {
    return NextResponse.json(
      { tuUsuario: usuario, error: `El hub respondió ${r.status} para la sala ${codigo}.` },
      { status: 200 },
    );
  }
  const sala = (await r.json()) as {
    players?: { userId: string; name: string; role: string }[];
  };
  const ordenados = (sala.players ?? [])
    .filter((p) => p.role === 'player')
    .sort((a, b) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
  const idx = ordenados.findIndex((p) => p.userId === usuario.id);

  return NextResponse.json({
    tuUsuario: { id: usuario.id, nombre: usuario.name },
    asientoQueTeToca: idx,
    rol: idx === 0 ? 'CONFIGURAS (anfitrión)' : idx === 1 ? 'ESPERAS (invitado)' : 'NO estás en la sala',
    jugadoresOrdenados: ordenados.map((p, i) => ({ asiento: i, userId: p.userId, nombre: p.name })),
  });
}

import { NextResponse } from 'next/server';
import { COOKIE_USER, MAX_AGE_USER, firmarUsuario } from '@/lib/hubUser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Fija la cookie de identidad del jugador tras el login con el hub. El cliente ya
// verificó la contraseña real contra Neon Auth (vía el proxy del hub); aquí solo
// firmamos su { id, name } para las siguientes peticiones. La pertenencia a cada
// sala se revalida aparte contra el hub.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { userId?: unknown; name?: unknown };
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : '';
    if (!userId) {
      return NextResponse.json({ error: 'Falta el usuario.' }, { status: 400 });
    }
    const token = await firmarUsuario({ id: userId, name });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_USER, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MAX_AGE_USER,
    });
    return res;
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

/** Cierra sesión: caduca la cookie de identidad. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_USER, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}

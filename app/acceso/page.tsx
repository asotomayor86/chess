'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Boton } from '@/components/ui/Boton';
import { loginHub } from '@/lib/clienteHub';
import { ruta } from '@/lib/rutas';

function FormularioAcceso() {
  const router = useRouter();
  const params = useSearchParams();
  const volver = params.get('volver') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrar = async () => {
    if (!email.trim() || !password.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      // 1) Verifica la contraseña real contra el hub (Neon Auth).
      const user = await loginHub(email.trim(), password);
      // 2) Fija la cookie de identidad del juego.
      const res = await fetch(ruta('/api/sso'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name: user.name }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'No se pudo iniciar sesión.');
        return;
      }
      router.replace(volver.startsWith('/') ? volver : '/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-tablaPanel p-6 shadow-panel">
        <h1 className="text-center font-title text-3xl tracking-wide text-crema">♞ Ajedrez</h1>
        <p className="mt-2 text-center text-sm text-crema/70">
          Entra con tu cuenta del Hub de Juegos en Familia (el mismo email y
          contraseña que usas en el hub).
        </p>
        <label className="mt-6 block">
          <span className="text-sm text-crema/80">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-crema outline-none focus:ring-2 focus:ring-acento/50"
            placeholder="tu@email.com"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-sm text-crema/80">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void entrar();
            }}
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-crema outline-none focus:ring-2 focus:ring-acento/50"
            placeholder="••••••••"
          />
        </label>
        {error && <p className="mt-3 text-sm text-jaque">{error}</p>}
        <div className="mt-6 flex justify-end">
          <Boton
            variante="primario"
            onClick={() => void entrar()}
            disabled={enviando || !email.trim() || !password.trim()}
          >
            {enviando ? 'Entrando…' : 'Entrar'}
          </Boton>
        </div>
      </div>
    </main>
  );
}

export default function PaginaAcceso() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <FormularioAcceso />
    </Suspense>
  );
}

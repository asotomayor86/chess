'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Boton } from '@/components/ui/Boton';
import { HUB_URL, logoutHub } from '@/lib/clienteHub';
import { ruta } from '@/lib/rutas';

function Menu() {
  const router = useRouter();
  const params = useSearchParams();
  const [saliendo, setSaliendo] = useState(false);

  // El hub abre el juego en /?sala=CÓDIGO: entramos directos a esa sala.
  const sala = (params.get('sala') || '').trim().toUpperCase();
  useEffect(() => {
    if (sala) router.replace(`/online/${sala}`);
  }, [sala, router]);

  const cerrarSesion = async () => {
    setSaliendo(true);
    await fetch(ruta('/api/sso'), { method: 'DELETE' }).catch(() => {});
    await logoutHub();
    window.location.href = `${HUB_URL}/hub`;
  };

  if (sala) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-crema/70">Entrando en la sala {sala}…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-10">
      <div className="w-full rounded-2xl border border-white/10 bg-tablaPanel p-8 text-center shadow-panel">
        <h1 className="font-title text-5xl tracking-widest text-crema">♞ AJEDREZ</h1>
        <p className="mt-2 text-crema/70">Ajedrez online por turnos · 2 jugadores</p>

        <div className="mt-8 rounded-lg border border-white/10 bg-black/20 p-5 text-left">
          <p className="text-crema/85">
            Este juego se juega <strong>desde el Hub de Juegos en Familia</strong>: crea
            una sala en el hub con los dos jugadores y ábrela para entrar aquí
            automáticamente.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Boton variante="primario" onClick={() => (window.location.href = `${HUB_URL}/salas`)}>
              Ir al Hub
            </Boton>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={cerrarSesion}
            disabled={saliendo}
            className="text-xs text-crema/40 underline-offset-2 transition hover:text-crema/70 hover:underline"
          >
            {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function PaginaMenu() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <Menu />
    </Suspense>
  );
}

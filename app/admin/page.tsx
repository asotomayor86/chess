'use client';

import { useState } from 'react';
import { Boton } from '@/components/ui/Boton';
import { ruta } from '@/lib/rutas';

/**
 * Panel mínimo de administración: borra el estado guardado de una partida por su
 * código, para reconfigurar una sala atascada. Protegido por ADMIN_PASSWORD (se
 * envía en cabecera; no se persiste). Si la clave no está configurada, la API
 * responde 401.
 */
export default function PaginaAdmin() {
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const borrar = async () => {
    const c = codigo.trim().toUpperCase();
    if (!c) return;
    if (!window.confirm(`¿Borrar el estado de la partida ${c}?`)) return;
    setTrabajando(true);
    setMensaje(null);
    try {
      const res = await fetch(ruta(`/api/admin/salas/${encodeURIComponent(c)}`), {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        borrada?: boolean;
      };
      if (!res.ok) {
        setMensaje(data.error || `Error ${res.status}`);
        return;
      }
      setMensaje(data.borrada ? `Partida ${c} borrada.` : `No existía ninguna partida ${c}.`);
    } catch (e: unknown) {
      setMensaje(e instanceof Error ? e.message : String(e));
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-tablaPanel p-6 shadow-panel">
        <h1 className="font-title text-2xl text-crema">Administración</h1>
        <p className="mt-2 text-sm text-crema/70">
          Reinicia una partida borrando su estado guardado. La sala del hub no se
          modifica.
        </p>
        <label className="mt-5 block">
          <span className="text-sm text-crema/80">Clave de administración</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-crema outline-none focus:ring-2 focus:ring-acento/50"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-sm text-crema/80">Código de sala</span>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 font-mono uppercase tracking-widest text-crema outline-none focus:ring-2 focus:ring-acento/50"
            placeholder="ABC234"
          />
        </label>
        {mensaje && <p className="mt-3 text-sm text-crema/80">{mensaje}</p>}
        <div className="mt-5 flex justify-end">
          <Boton
            variante="peligro"
            onClick={borrar}
            disabled={trabajando || !password || !codigo.trim()}
          >
            {trabajando ? 'Borrando…' : 'Borrar partida'}
          </Boton>
        </div>
      </div>
    </main>
  );
}

'use client';

import type { EstadoPartida, Asiento } from './tipos';
import { ruta } from './rutas';

async function leerError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || `Error ${res.status}`;
  } catch {
    return `Error ${res.status}`;
  }
}

/** Crea la fila de la partida (la hace el anfitrión). 409 si ya existía. */
export async function crearSala(codigo: string, estado: EstadoPartida): Promise<void> {
  const res = await fetch(ruta('/api/salas'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo, estado }),
  });
  // 409 = ya existe: no es error, simplemente nos unimos a la partida en curso.
  if (!res.ok && res.status !== 409) throw new Error(await leerError(res));
}

export async function obtenerEstadoSala(codigo: string): Promise<EstadoPartida | null> {
  const res = await fetch(ruta(`/api/salas/${encodeURIComponent(codigo)}`), {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await leerError(res));
  const data = (await res.json()) as { estado: EstadoPartida };
  return data.estado;
}

export async function actualizarEstadoSala(
  codigo: string,
  estado: EstadoPartida,
): Promise<void> {
  const res = await fetch(ruta(`/api/salas/${encodeURIComponent(codigo)}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  });
  if (!res.ok) throw new Error(await leerError(res));
}

export interface SalaHub {
  miIndice: Asiento;
  jugadores: [string, string];
  userIds: [string, string];
}

/** Lee la sala del HUB por su código: mi asiento (0/1) y los dos jugadores. */
export async function obtenerSalaHub(codigo: string): Promise<SalaHub> {
  const res = await fetch(ruta(`/api/sala-hub/${encodeURIComponent(codigo)}`), {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await leerError(res));
  return (await res.json()) as SalaHub;
}

/** Pide al backend que envíe el resultado de la partida al hub (idempotente). */
export async function enviarResultadoHub(codigo: string): Promise<void> {
  const res = await fetch(ruta(`/api/sala-hub/${encodeURIComponent(codigo)}/resultado`), {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await leerError(res));
}

export interface SuscripcionSala {
  desuscribir: () => void;
}

/**
 * Sincronización en tiempo real vía SSE. El navegador abre un EventSource contra
 * `/api/salas/[codigo]/stream`; el servidor sondea Neon y empuja el estado cuando
 * cambia la versión. EventSource reconecta solo si la conexión se cierra (vida
 * máxima del stream o errores transitorios).
 */
export function suscribirseASala(
  codigo: string,
  onCambio: (estado: EstadoPartida) => void,
): SuscripcionSala {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return { desuscribir: () => undefined };
  }

  const fuente = new EventSource(ruta(`/api/salas/${encodeURIComponent(codigo)}/stream`));

  fuente.addEventListener('estado', (ev) => {
    try {
      const data = JSON.parse((ev as MessageEvent).data) as { estado: EstadoPartida };
      if (data.estado) onCambio(data.estado);
    } catch {
      /* ignora mensajes malformados */
    }
  });

  return {
    desuscribir: () => fuente.close(),
  };
}

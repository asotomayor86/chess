'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Boton } from '@/components/ui/Boton';
import { Partida } from '@/components/Partida';
import { useStore } from '@/lib/store';
import {
  crearSala,
  enviarResultadoHub,
  obtenerEstadoSala,
  obtenerSalaHub,
  suscribirseASala,
  type SalaHub,
  type SuscripcionSala,
} from '@/lib/online';
import { fenInicial } from '@/lib/ajedrez';
import { HUB_URL } from '@/lib/clienteHub';
import type { Asiento, EstadoPartida } from '@/lib/tipos';

type EstadoUI =
  | { tipo: 'cargando' }
  | { tipo: 'config-host'; sala: SalaHub }
  | { tipo: 'esperando-host'; sala: SalaHub }
  | { tipo: 'jugando' }
  | { tipo: 'error'; mensaje: string };

function volverAlHub() {
  window.location.href = `${HUB_URL}/salas`;
}

/** Construye el estado inicial de la partida (lo crea el anfitrión). */
function estadoInicial(sala: SalaHub, blancas: Asiento): EstadoPartida {
  const negras: Asiento = blancas === 0 ? 1 : 0;
  return {
    fen: fenInicial(),
    historial: [],
    ultimo: null,
    colores: { w: blancas, b: negras },
    jugador2Unido: false,
    ofertaTablas: null,
    fin: null,
    serie: {
      fase: 'en-curso',
      userIds: sala.userIds,
      ganadorSerie: null,
      empateSerie: false,
      resultadoEnviado: false,
    },
  };
}

export default function PaginaSalaOnline() {
  const params = useParams<{ codigo: string }>();
  const codigo = (params?.codigo ?? '').toUpperCase();

  const estado = useStore((s) => s.estado);
  const miAsiento = useStore((s) => s.miAsiento);
  const ofertaTablas = useStore((s) => s.estado?.ofertaTablas ?? null);
  const cargarOnline = useStore((s) => s.cargarOnline);
  const aplicarEstadoEntrante = useStore((s) => s.aplicarEstadoEntrante);
  const unirse = useStore((s) => s.unirse);
  const ofrecerTablas = useStore((s) => s.ofrecerTablas);
  const responderTablas = useStore((s) => s.responderTablas);
  const abandonar = useStore((s) => s.abandonar);

  const [ui, setUI] = useState<EstadoUI>({ tipo: 'cargando' });
  const suscripcionRef = useRef<SuscripcionSala | null>(null);
  const resultadoEnviadoRef = useRef(false);

  // Carga inicial: resuelve mi asiento en el hub y la partida (si ya existe).
  useEffect(() => {
    if (!codigo) return;
    let cancelado = false;
    (async () => {
      try {
        const sala = await obtenerSalaHub(codigo);
        if (cancelado) return;
        const estadoActual = await obtenerEstadoSala(codigo);
        if (cancelado) return;
        if (estadoActual) {
          cargarOnline(codigo, sala.miIndice, sala.jugadores, estadoActual);
          if (sala.miIndice === 1 && !estadoActual.jugador2Unido) unirse();
          setUI({ tipo: 'jugando' });
        } else if (sala.miIndice === 0) {
          setUI({ tipo: 'config-host', sala });
        } else {
          setUI({ tipo: 'esperando-host', sala });
        }
      } catch (e: unknown) {
        if (!cancelado) {
          setUI({ tipo: 'error', mensaje: e instanceof Error ? e.message : String(e) });
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [codigo, cargarOnline, unirse]);

  // El invitado espera a que el anfitrión configure la partida: sondeamos hasta
  // que exista el estado y entonces entramos.
  useEffect(() => {
    if (ui.tipo !== 'esperando-host') return;
    let cancelado = false;
    const id = setInterval(async () => {
      try {
        const estadoActual = await obtenerEstadoSala(codigo);
        if (cancelado || !estadoActual) return;
        cargarOnline(codigo, 1, ui.sala.jugadores, estadoActual);
        if (!estadoActual.jugador2Unido) unirse();
        if (!cancelado) setUI({ tipo: 'jugando' });
      } catch {
        /* reintenta en el siguiente tick */
      }
    }, 2000);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [ui, codigo, cargarOnline, unirse]);

  // Suscripción en tiempo real mientras se juega.
  useEffect(() => {
    if (ui.tipo !== 'jugando') return;
    if (suscripcionRef.current) return;
    suscripcionRef.current = suscribirseASala(codigo, (nuevo) => aplicarEstadoEntrante(nuevo));
    return () => {
      suscripcionRef.current?.desuscribir();
      suscripcionRef.current = null;
    };
  }, [ui.tipo, codigo, aplicarEstadoEntrante]);

  // Cuando la partida termina, enviamos el resultado al hub (una sola vez).
  useEffect(() => {
    if (ui.tipo !== 'jugando' || !estado?.fin) return;
    if (estado.serie.resultadoEnviado || resultadoEnviadoRef.current) return;
    resultadoEnviadoRef.current = true;
    enviarResultadoHub(codigo).catch(() => {
      // Si falla (p. ej. red), permitimos reintentar en el siguiente render.
      resultadoEnviadoRef.current = false;
    });
  }, [ui.tipo, estado?.fin, estado?.serie.resultadoEnviado, codigo]);

  const empezarComoHost = useCallback(
    async (blancas: Asiento, sala: SalaHub) => {
      try {
        const inicial = estadoInicial(sala, blancas);
        await crearSala(codigo, inicial);
        const estadoActual = (await obtenerEstadoSala(codigo)) ?? inicial;
        cargarOnline(codigo, 0, sala.jugadores, estadoActual);
        setUI({ tipo: 'jugando' });
      } catch (e: unknown) {
        setUI({ tipo: 'error', mensaje: e instanceof Error ? e.message : String(e) });
      }
    },
    [codigo, cargarOnline],
  );

  if (ui.tipo === 'cargando') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-crema/70">Cargando sala {codigo}…</p>
      </main>
    );
  }

  if (ui.tipo === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-white/10 bg-tablaPanel p-6 text-center shadow-panel">
          <p className="text-jaque">{ui.mensaje}</p>
          <div className="mt-4">
            <Boton variante="secundario" onClick={volverAlHub}>
              Volver al hub
            </Boton>
          </div>
        </div>
      </main>
    );
  }

  if (ui.tipo === 'config-host') {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-tablaPanel p-6 text-center shadow-panel">
          <h1 className="font-title text-2xl text-crema">Sala {codigo}</h1>
          <p className="mt-2 text-sm text-crema/70">
            Partida entre <strong>{ui.sala.jugadores[0]}</strong> y{' '}
            <strong>{ui.sala.jugadores[1]}</strong>. Elige con qué color juegas tú.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Boton variante="secundario" onClick={() => empezarComoHost(0, ui.sala)}>
              ♔ Blancas
            </Boton>
            <Boton variante="secundario" onClick={() => empezarComoHost(1, ui.sala)}>
              ♚ Negras
            </Boton>
            <Boton
              variante="primario"
              onClick={() =>
                empezarComoHost(Math.random() < 0.5 ? 0 : 1, ui.sala)
              }
            >
              🎲 Sorteo
            </Boton>
          </div>
        </div>
      </main>
    );
  }

  if (ui.tipo === 'esperando-host') {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-white/10 bg-tablaPanel p-6 text-center shadow-panel">
          <h1 className="font-title text-2xl text-crema">Sala {codigo}</h1>
          <p className="mt-3 text-crema/70">
            Esperando a que <strong>{ui.sala.jugadores[0]}</strong> configure la partida…
          </p>
        </div>
      </main>
    );
  }

  // ui.tipo === 'jugando'
  const finExtra = (
    <>
      <p className="text-xs text-crema/60">
        {estado?.serie.resultadoEnviado
          ? 'Resultado registrado en el hub.'
          : 'Registrando resultado…'}
      </p>
      <Boton variante="primario" onClick={volverAlHub}>
        Volver al hub
      </Boton>
    </>
  );

  const hayOfertaRival = ofertaTablas !== null && ofertaTablas !== miAsiento;
  const oferteYo = ofertaTablas !== null && ofertaTablas === miAsiento;

  const controles = estado?.fin ? null : (
    <>
      {hayOfertaRival && (
        <div className="rounded-md border border-acento/40 bg-acento/15 p-2 text-center text-sm">
          <p className="mb-2 text-crema">Tu rival ofrece tablas.</p>
          <div className="flex justify-center gap-2">
            <Boton variante="primario" onClick={() => responderTablas(true)}>
              Aceptar
            </Boton>
            <Boton variante="fantasma" onClick={() => responderTablas(false)}>
              Rechazar
            </Boton>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <Boton
          variante="secundario"
          className="flex-1"
          disabled={ofertaTablas !== null}
          onClick={ofrecerTablas}
        >
          {oferteYo ? 'Tablas ofrecidas…' : 'Ofrecer tablas'}
        </Boton>
        <Boton
          variante="peligro"
          className="flex-1"
          onClick={() => {
            if (window.confirm('¿Seguro que quieres abandonar la partida?')) abandonar();
          }}
        >
          Abandonar
        </Boton>
      </div>
    </>
  );

  return (
    <main className="min-h-screen">
      <Partida controles={controles} finExtra={finExtra} />
    </main>
  );
}

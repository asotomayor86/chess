'use client';

import { create } from 'zustand';
import {
  aplicarMovimiento,
  deCasilla,
  fenInicial,
  necesitaPromocion,
  tableroDesdeFen,
  turno,
  type Color,
  type Promocion,
  type Square,
} from './ajedrez';
import type { Asiento, EstadoPartida, FinPartida } from './tipos';
import { actualizarEstadoSala } from './online';

export type Modo = 'local' | 'online';

interface Estado {
  codigo: string | null;
  modo: Modo;
  miAsiento: Asiento | null;
  nombres: [string, string];
  estado: EstadoPartida | null;

  // UI
  seleccion: Square | null;
  promocion: { origen: Square; destino: Square } | null;
  error: string | null;
}

interface Acciones {
  iniciarLocal: () => void;
  cargarOnline: (
    codigo: string,
    miAsiento: Asiento,
    nombres: [string, string],
    estado: EstadoPartida,
  ) => void;
  aplicarEstadoEntrante: (estado: EstadoPartida) => void;
  unirse: () => void;

  seleccionar: (sq: Square) => void;
  elegirPromocion: (pieza: Promocion) => void;
  cancelarPromocion: () => void;

  ofrecerTablas: () => void;
  responderTablas: (aceptar: boolean) => void;
  abandonar: () => void;
}

export type StoreAjedrez = Estado & Acciones;

/** Color del jugador en su asiento (según el sorteo guardado en el estado). */
export function miColor(estado: EstadoPartida, asiento: Asiento): Color {
  return estado.colores.w === asiento ? 'w' : 'b';
}

/** ¿Es mi turno de mover? (online: mi color == quien mueve, rival presente y sin fin). */
export function esMiTurno(estado: EstadoPartida, asiento: Asiento | null): boolean {
  if (asiento === null || estado.fin || !estado.jugador2Unido) return false;
  return turno(estado.fen) === miColor(estado, asiento);
}

const SERIE_VACIA = (userIds: [string, string]) => ({
  fase: 'en-curso' as const,
  userIds,
  ganadorSerie: null,
  empateSerie: false,
  resultadoEnviado: false,
});

/** Construye la cabecera de resultado cuando la partida termina. */
function serieFin(estado: EstadoPartida, ganadorColor: Color | null) {
  if (ganadorColor === null) {
    return { ...estado.serie, fase: 'fin' as const, ganadorSerie: null, empateSerie: true };
  }
  const ganadorAsiento = estado.colores[ganadorColor];
  return {
    ...estado.serie,
    fase: 'fin' as const,
    ganadorSerie: ganadorAsiento,
    empateSerie: false,
  };
}

export const useStore = create<StoreAjedrez>((set, get) => {
  /** Aplica el nuevo estado localmente y, en online, lo persiste en el servidor. */
  const confirmar = (nuevo: EstadoPartida) => {
    set({ estado: nuevo, seleccion: null, promocion: null });
    const { modo, codigo } = get();
    if (modo === 'online' && codigo) {
      actualizarEstadoSala(codigo, nuevo).catch((e) =>
        set({ error: e instanceof Error ? e.message : String(e) }),
      );
    }
  };

  /** Color que puede mover ahora: en local, el del turno; en online, el mío. */
  const colorActivo = (): Color | null => {
    const { estado, modo, miAsiento } = get();
    if (!estado) return null;
    if (modo === 'local') return turno(estado.fen);
    return miAsiento === null ? null : miColor(estado, miAsiento);
  };

  const mover = (origen: Square, destino: Square, promo?: Promocion) => {
    const { estado } = get();
    if (!estado || estado.fin) return;
    if (!promo && necesitaPromocion(estado.fen, origen, destino)) {
      set({ promocion: { origen, destino }, seleccion: null });
      return;
    }
    const res = aplicarMovimiento(estado.fen, origen, destino, promo);
    if (!res) {
      set({ seleccion: null, promocion: null });
      return;
    }
    let fin: FinPartida | null = null;
    let serie = estado.serie;
    if (res.fin) {
      fin = { tipo: res.fin.tipo, ganador: res.fin.ganador };
      serie = serieFin(estado, res.fin.ganador);
    }
    confirmar({
      ...estado,
      fen: res.fen,
      historial: [...estado.historial, res.san],
      ultimo: { from: origen, to: destino },
      ofertaTablas: null, // una jugada anula cualquier oferta de tablas pendiente
      fin,
      serie,
    });
  };

  return {
    codigo: null,
    modo: 'online',
    miAsiento: null,
    nombres: ['Jugador 1', 'Jugador 2'],
    estado: null,
    seleccion: null,
    promocion: null,
    error: null,

    iniciarLocal: () => {
      const userIds: [string, string] = ['local-0', 'local-1'];
      set({
        modo: 'local',
        codigo: null,
        miAsiento: 0,
        nombres: ['Blancas', 'Negras'],
        seleccion: null,
        promocion: null,
        error: null,
        estado: {
          fen: fenInicial(),
          historial: [],
          ultimo: null,
          colores: { w: 0, b: 1 },
          jugador2Unido: true,
          ofertaTablas: null,
          fin: null,
          serie: SERIE_VACIA(userIds),
        },
      });
    },

    cargarOnline: (codigo, miAsiento, nombres, estado) =>
      set({
        modo: 'online',
        codigo,
        miAsiento,
        nombres,
        estado,
        seleccion: null,
        promocion: null,
        error: null,
      }),

    aplicarEstadoEntrante: (estado) =>
      // El servidor es la fuente de verdad: reemplazamos y limpiamos la UI local.
      set({ estado, seleccion: null, promocion: null }),

    unirse: () => {
      // El invitado (asiento 1) marca su entrada para que arranque la partida.
      const { estado, miAsiento } = get();
      if (!estado || miAsiento !== 1 || estado.jugador2Unido) return;
      confirmar({ ...estado, jugador2Unido: true });
    },

    seleccionar: (sq) => {
      const { estado, seleccion, modo, miAsiento } = get();
      if (!estado || estado.fin) return;
      const puedoMover =
        modo === 'local' || (estado.jugador2Unido && esMiTurno(estado, miAsiento));
      if (!puedoMover) return;

      const activo = colorActivo();
      const tablero = tableroDesdeFen(estado.fen);
      const { fila, col } = deCasilla(sq);
      const pieza = tablero[fila][col];

      if (seleccion) {
        if (sq === seleccion) {
          set({ seleccion: null });
          return;
        }
        if (pieza && pieza.color === activo) {
          set({ seleccion: sq });
          return;
        }
        // Intentamos mover; si el destino no es legal, mover() limpia la selección.
        mover(seleccion, sq);
        return;
      }
      if (pieza && pieza.color === activo) set({ seleccion: sq });
    },

    elegirPromocion: (pieza) => {
      const { promocion } = get();
      if (!promocion) return;
      mover(promocion.origen, promocion.destino, pieza);
    },

    cancelarPromocion: () => set({ promocion: null, seleccion: null }),

    ofrecerTablas: () => {
      const { estado, miAsiento } = get();
      if (!estado || estado.fin || miAsiento === null) return;
      confirmar({ ...estado, ofertaTablas: miAsiento });
    },

    responderTablas: (aceptar) => {
      const { estado } = get();
      if (!estado || estado.ofertaTablas === null) return;
      if (!aceptar) {
        confirmar({ ...estado, ofertaTablas: null });
        return;
      }
      confirmar({
        ...estado,
        ofertaTablas: null,
        fin: { tipo: 'tablas-acuerdo', ganador: null },
        serie: serieFin(estado, null),
      });
    },

    abandonar: () => {
      const { estado, miAsiento } = get();
      if (!estado || estado.fin || miAsiento === null) return;
      const yo = miColor(estado, miAsiento);
      const ganador: Color = yo === 'w' ? 'b' : 'w';
      confirmar({
        ...estado,
        ofertaTablas: null,
        fin: { tipo: 'abandono', ganador },
        serie: serieFin(estado, ganador),
      });
    },
  };
});

'use client';

import type { ReactNode } from 'react';
import { turno, type Color } from '@/lib/ajedrez';
import { esMiTurno, miColor, useStore } from '@/lib/store';
import type { EstadoPartida, FinPartida } from '@/lib/tipos';
import { Tablero } from './Tablero';
import { Promocion } from './Promocion';
import { Capturas } from './Capturas';
import { Historial } from './Historial';

const TEXTO_FIN: Record<FinPartida['tipo'], string> = {
  'jaque-mate': 'Jaque mate',
  ahogado: 'Rey ahogado',
  'tablas-material': 'Tablas por material insuficiente',
  'tablas-repeticion': 'Tablas por repetición',
  'tablas-50': 'Tablas (regla de 50 jugadas)',
  'tablas-acuerdo': 'Tablas de común acuerdo',
  abandono: 'Abandono',
};

function nombreDe(estado: EstadoPartida, nombres: [string, string], color: Color) {
  return nombres[estado.colores[color]] || (color === 'w' ? 'Blancas' : 'Negras');
}

function mensajeFin(estado: EstadoPartida, nombres: [string, string]): string {
  const fin = estado.fin!;
  if (fin.ganador === null) return TEXTO_FIN[fin.tipo];
  return `${nombreDe(estado, nombres, fin.ganador)} gana · ${TEXTO_FIN[fin.tipo]}`;
}

/** Cabecera de un jugador: nombre, color y piezas que ha capturado. */
function FilaJugador({
  estado,
  nombres,
  color,
  activo,
}: {
  estado: EstadoPartida;
  nombres: [string, string];
  color: Color;
  activo: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-md px-3 py-2 transition ${
        activo ? 'bg-acento/25 ring-1 ring-acento/50' : 'bg-black/20'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full ring-1 ring-black/40"
          style={{ backgroundColor: color === 'w' ? '#f7f7f2' : '#262421' }}
        />
        <span className="font-medium text-crema">{nombreDe(estado, nombres, color)}</span>
      </div>
      <Capturas fen={estado.fen} bando={color} />
    </div>
  );
}

export function Partida({
  controles,
  finExtra,
}: {
  controles?: ReactNode;
  finExtra?: ReactNode;
}) {
  const estado = useStore((s) => s.estado);
  const nombres = useStore((s) => s.nombres);
  const modo = useStore((s) => s.modo);
  const miAsiento = useStore((s) => s.miAsiento);

  if (!estado) return null;

  // Color de abajo: en local blancas; en online, el mío.
  const colorAbajo: Color = modo === 'local' || miAsiento === null ? 'w' : miColor(estado, miAsiento);
  const colorArriba: Color = colorAbajo === 'w' ? 'b' : 'w';
  const activo = turno(estado.fen);

  const miTurno = modo === 'local' ? true : esMiTurno(estado, miAsiento);
  const esperandoRival = modo === 'online' && !estado.jugador2Unido && !estado.fin;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-3 md:flex-row md:items-start md:p-6">
      {/* Tablero + jugadores */}
      <div className="flex w-full flex-col gap-2 md:max-w-[640px]">
        <FilaJugador
          estado={estado}
          nombres={nombres}
          color={colorArriba}
          activo={!estado.fin && activo === colorArriba}
        />
        <div className="relative">
          <Tablero />
          {/* Overlay de fin de partida */}
          {estado.fin && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-black/55 p-4">
              <div className="w-full max-w-xs rounded-xl border border-white/10 bg-tablaPanel p-5 text-center shadow-panel">
                <p className="text-lg font-semibold text-crema">{mensajeFin(estado, nombres)}</p>
                <div className="mt-4 flex flex-col gap-2">{finExtra}</div>
              </div>
            </div>
          )}
          {esperandoRival && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/40">
              <p className="rounded-md bg-tablaPanel px-4 py-2 text-sm text-crema/80">
                Esperando a que entre el rival…
              </p>
            </div>
          )}
        </div>
        <FilaJugador
          estado={estado}
          nombres={nombres}
          color={colorAbajo}
          activo={!estado.fin && activo === colorAbajo}
        />
      </div>

      {/* Panel lateral */}
      <div className="flex w-full flex-col gap-3 md:flex-1">
        <div className="rounded-md border border-white/10 bg-tablaPanel px-3 py-2 text-sm">
          {estado.fin ? (
            <span className="text-crema/70">Partida terminada</span>
          ) : esperandoRival ? (
            <span className="text-crema/70">Esperando al rival…</span>
          ) : miTurno ? (
            <span className="font-medium text-acento">Tu turno</span>
          ) : (
            <span className="text-crema/70">
              Turno de {nombreDe(estado, nombres, activo)}…
            </span>
          )}
        </div>

        <Historial jugadas={estado.historial} />

        {controles && <div className="flex flex-col gap-2">{controles}</div>}
      </div>

      <Promocion />
    </div>
  );
}

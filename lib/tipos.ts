import type { Color, Square } from './ajedrez';

/** Asiento del jugador en la sala del hub (0 = anfitrión, 1 = invitado). */
export type Asiento = 0 | 1;

export type TipoFin =
  | 'jaque-mate'
  | 'ahogado'
  | 'tablas-material'
  | 'tablas-repeticion'
  | 'tablas-50'
  | 'tablas-acuerdo'
  | 'abandono';

export interface FinPartida {
  tipo: TipoFin;
  ganador: Color | null; // null = tablas
}

/**
 * Cabecera para reportar el resultado al hub. Misma forma que en los demás juegos
 * (la lee /api/sala-hub/[codigo]/resultado): aunque aquí es una sola partida, lo
 * llamamos "serie" para encajar con el contrato del hub.
 */
export interface SerieHub {
  fase: 'en-curso' | 'fin';
  userIds: [string, string]; // userIds[asiento]
  ganadorSerie: Asiento | null; // asiento ganador; null si tablas
  empateSerie: boolean;
  resultadoEnviado: boolean;
}

/** Estado completo de la partida. Es lo que se guarda como JSONB y viaja por SSE. */
export interface EstadoPartida {
  fen: string;
  historial: string[]; // movimientos en SAN, en orden
  ultimo: { from: Square; to: Square } | null; // última jugada (para resaltarla)
  /** Mapeo color → asiento. userIds[colores.w] juega con blancas. */
  colores: { w: Asiento; b: Asiento };
  jugador2Unido: boolean;
  ofertaTablas: Asiento | null; // asiento que ofrece tablas, o null
  fin: FinPartida | null;
  serie: SerieHub;
}

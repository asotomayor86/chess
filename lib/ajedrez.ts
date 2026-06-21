// Envoltura fina sobre chess.js. Centraliza TODA la lógica de reglas (movimientos
// legales, jaque, jaque mate, ahogado, tablas) para que la UI y el store no
// dependan directamente de la librería. Cada función parte de un FEN (estado
// inmutable que viaja por la red) y crea su propia instancia: así nunca
// compartimos un objeto Chess mutable entre componentes.
import { Chess, type Square } from 'chess.js';

export type Color = 'w' | 'b';
export type TipoPieza = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Promocion = 'q' | 'r' | 'b' | 'n';

export interface Pieza {
  color: Color;
  tipo: TipoPieza;
}
export type Casillero = Pieza | null;
/** Tablero 8×8. Fila 0 = rank 8 (arriba, vista de blancas); columna 0 = file a. */
export type Tablero = Casillero[][];

const FEN_INICIAL = new Chess().fen();

export function fenInicial(): string {
  return FEN_INICIAL;
}

/** fila/col (0..7, fila 0 = rank 8) → notación algebraica ("e4"). */
export function aCasilla(fila: number, col: number): Square {
  const file = 'abcdefgh'[col];
  const rank = 8 - fila;
  return `${file}${rank}` as Square;
}

/** Notación algebraica → { fila, col } (fila 0 = rank 8). */
export function deCasilla(sq: Square): { fila: number; col: number } {
  return { col: sq.charCodeAt(0) - 97, fila: 8 - Number(sq[1]) };
}

/** Crea la rejilla 8×8 a partir de un FEN (o tablero vacío si el FEN es inválido). */
export function tableroDesdeFen(fen: string): Tablero {
  try {
    const chess = new Chess(fen);
    // chess.board() devuelve rank8..rank1, cada fila file a..h.
    return chess.board().map((fila) =>
      fila.map((c) => (c ? { color: c.color as Color, tipo: c.type as TipoPieza } : null)),
    );
  } catch {
    return Array.from({ length: 8 }, () => Array<Casillero>(8).fill(null));
  }
}

export function turno(fen: string): Color {
  try {
    return new Chess(fen).turn() as Color;
  } catch {
    return 'w';
  }
}

export interface MovimientoLegal {
  destino: Square;
  captura: boolean;
  promocion: boolean;
}

/** Movimientos legales desde una casilla (deduplica las 4 promociones del peón). */
export function movimientosLegales(fen: string, origen: Square): MovimientoLegal[] {
  try {
    const chess = new Chess(fen);
    const vistos = new Map<string, MovimientoLegal>();
    for (const m of chess.moves({ square: origen, verbose: true })) {
      const captura = m.flags.includes('c') || m.flags.includes('e');
      const promocion = m.flags.includes('p');
      const prev = vistos.get(m.to);
      vistos.set(m.to, {
        destino: m.to,
        captura: captura || (prev?.captura ?? false),
        promocion: promocion || (prev?.promocion ?? false),
      });
    }
    return [...vistos.values()];
  } catch {
    return [];
  }
}

/** ¿Ese movimiento es una promoción (peón llegando a la última fila)? */
export function necesitaPromocion(fen: string, origen: Square, destino: Square): boolean {
  try {
    const chess = new Chess(fen);
    return chess
      .moves({ square: origen, verbose: true })
      .some((m) => m.to === destino && m.flags.includes('p'));
  } catch {
    return false;
  }
}

export type TipoFinReglas =
  | 'jaque-mate'
  | 'ahogado'
  | 'tablas-material'
  | 'tablas-repeticion'
  | 'tablas-50';

export interface FinReglas {
  tipo: TipoFinReglas;
  ganador: Color | null; // null = tablas
}

export interface ResultadoMovimiento {
  fen: string;
  san: string;
  captura: boolean;
  promocion: boolean;
  jaque: boolean;
  fin: FinReglas | null;
}

/** Aplica un movimiento sobre el FEN. Devuelve el resultado o null si es ilegal. */
export function aplicarMovimiento(
  fen: string,
  origen: Square,
  destino: Square,
  promocion: Promocion = 'q',
): ResultadoMovimiento | null {
  try {
    const chess = new Chess(fen);
    const mov = chess.move({ from: origen, to: destino, promotion: promocion });
    if (!mov) return null;
    return {
      fen: chess.fen(),
      san: mov.san,
      captura: mov.flags.includes('c') || mov.flags.includes('e'),
      promocion: mov.flags.includes('p'),
      jaque: chess.isCheck(),
      fin: finDeReglas(chess),
    };
  } catch {
    return null;
  }
}

function finDeReglas(chess: Chess): FinReglas | null {
  if (chess.isCheckmate()) {
    // Quien tiene el turno tras la jugada es el que recibe el mate → pierde.
    const perdedor = chess.turn() as Color;
    return { tipo: 'jaque-mate', ganador: perdedor === 'w' ? 'b' : 'w' };
  }
  if (chess.isStalemate()) return { tipo: 'ahogado', ganador: null };
  if (chess.isInsufficientMaterial()) return { tipo: 'tablas-material', ganador: null };
  if (chess.isThreefoldRepetition()) return { tipo: 'tablas-repeticion', ganador: null };
  if (chess.isDraw()) return { tipo: 'tablas-50', ganador: null };
  return null;
}

/** Casilla del rey en jaque (para resaltarla en rojo), o null si no hay jaque. */
export function casillaJaque(fen: string): Square | null {
  try {
    const chess = new Chess(fen);
    if (!chess.isCheck()) return null;
    const color = chess.turn();
    for (const fila of chess.board()) {
      for (const c of fila) {
        if (c && c.type === 'k' && c.color === color) return c.square;
      }
    }
    return null;
  } catch {
    return null;
  }
}

const CONTEO_INICIAL: Record<TipoPieza, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const VALOR: Record<TipoPieza, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export interface Material {
  /** Piezas capturadas A las blancas (las negras se las comieron) y viceversa. */
  capturadasBlancas: TipoPieza[];
  capturadasNegras: TipoPieza[];
  /** Ventaja de material en puntos (positivo = ventaja de las blancas). */
  ventaja: number;
}

/** Material capturado, derivado de las piezas que faltan respecto al inicio. */
export function material(fen: string): Material {
  const tablero = tableroDesdeFen(fen);
  const presentes: Record<Color, Record<TipoPieza, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };
  for (const fila of tablero) {
    for (const c of fila) {
      if (c) presentes[c.color][c.tipo] += 1;
    }
  }
  const capturadasBlancas: TipoPieza[] = [];
  const capturadasNegras: TipoPieza[] = [];
  let ventaja = 0;
  for (const tipo of ['q', 'r', 'b', 'n', 'p'] as TipoPieza[]) {
    const faltanB = CONTEO_INICIAL[tipo] - presentes.w[tipo];
    const faltanN = CONTEO_INICIAL[tipo] - presentes.b[tipo];
    for (let i = 0; i < faltanB; i++) capturadasBlancas.push(tipo);
    for (let i = 0; i < faltanN; i++) capturadasNegras.push(tipo);
    ventaja += (presentes.w[tipo] - presentes.b[tipo]) * VALOR[tipo];
  }
  return { capturadasBlancas, capturadasNegras, ventaja };
}

export type { Square };

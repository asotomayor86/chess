// Crea la tabla `partidas` en Neon. Idempotente.
// Uso: node scripts/init-db.mjs
// Lee DATABASE_URL de process.env o, si falta, de .env.local.
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

function cargarUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const linea of env.split('\n')) {
      const m = linea.match(/^DATABASE_URL=(.*)$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* sin .env.local */
  }
  throw new Error('DATABASE_URL no encontrada (ni en entorno ni en .env.local).');
}

const sql = neon(cargarUrl());

// Una partida de ajedrez = una fila. El estado (posición FEN + historial + serie)
// va en `estado` jsonb; `version` se incrementa en cada jugada para que el SSE
// detecte cambios con un sondeo barato.
await sql`
  create table if not exists partidas (
    codigo     text primary key,
    estado     jsonb not null,
    version    integer not null default 0,
    updated_at timestamptz not null default now()
  )
`;

const filas = await sql`
  select column_name, data_type
  from information_schema.columns
  where table_name = 'partidas'
  order by ordinal_position
`;
console.log('Tabla `partidas` lista. Columnas:');
for (const f of filas) console.log(`  - ${f.column_name} (${f.data_type})`);

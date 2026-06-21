import { sql } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// En planes de pago, Vercel permite mantener la función abierta hasta este límite
// (en hobby se recorta antes y el EventSource simplemente reconecta más a menudo).
export const maxDuration = 60;

// Tiempo máximo que mantenemos la conexión abierta antes de dejar que el navegador
// reconecte (EventSource reconecta solo). Por debajo de los límites de funciones de
// Vercel.
const VIDA_MAX_MS = 45_000;
const INTERVALO_MS = 300;

function normalizar(codigo: string): string | null {
  const c = (codigo ?? '').toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(c) ? c : null;
}

export async function GET(_req: Request, { params }: { params: { codigo: string } }) {
  const codigo = normalizar(params.codigo);
  if (!codigo) {
    return new Response('Código inválido.', { status: 400 });
  }

  const encoder = new TextEncoder();
  let cerrado = false;

  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (evento: string, datos: unknown) => {
        if (cerrado) return;
        controller.enqueue(
          encoder.encode(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`),
        );
      };

      const inicio = Date.now();
      let ultimaVersion = -1;

      // Comentario inicial para abrir el flujo de inmediato.
      controller.enqueue(encoder.encode(': conectado\n\n'));

      try {
        while (!cerrado && Date.now() - inicio < VIDA_MAX_MS) {
          // Sondeo barato: solo la versión. El estado completo se envía únicamente
          // cuando la versión ha cambiado.
          const versiones = await sql()`
            select version from partidas where codigo = ${codigo}
          `;
          if (versiones.length === 0) {
            enviar('no-existe', {});
            break;
          }
          const version = (versiones[0] as { version: number }).version;
          if (version !== ultimaVersion) {
            const filas = await sql()`
              select estado, version from partidas where codigo = ${codigo}
            `;
            if (filas.length > 0) {
              const fila = filas[0] as { estado: unknown; version: number };
              ultimaVersion = fila.version;
              enviar('estado', { estado: fila.estado, version: fila.version });
            }
          }
          await new Promise((r) => setTimeout(r, INTERVALO_MS));
        }
      } catch {
        // Cualquier error termina el flujo; el cliente reconectará.
      } finally {
        if (!cerrado) {
          cerrado = true;
          try {
            controller.close();
          } catch {
            /* ya cerrado */
          }
        }
      }
    },
    cancel() {
      cerrado = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

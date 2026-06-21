'use client';

import { useEffect } from 'react';
import { Boton } from '@/components/ui/Boton';
import { Partida } from '@/components/Partida';
import { useStore } from '@/lib/store';

/**
 * Tablero local (hotseat) para probar el motor sin el hub: dos jugadores se turnan
 * en la misma pantalla. No usa red ni base de datos.
 */
export default function PaginaLocal() {
  const iniciarLocal = useStore((s) => s.iniciarLocal);
  const estado = useStore((s) => s.estado);

  useEffect(() => {
    iniciarLocal();
  }, [iniciarLocal]);

  if (!estado) return <main className="min-h-screen" />;

  return (
    <main className="min-h-screen">
      <Partida
        controles={
          <Boton variante="secundario" onClick={iniciarLocal}>
            Reiniciar partida
          </Boton>
        }
        finExtra={
          <Boton variante="primario" onClick={iniciarLocal}>
            Nueva partida
          </Boton>
        }
      />
    </main>
  );
}

import { useEffect, useState } from 'react';

import { contratacionService } from '../services/contratacionService';
import { ResponsableDeLugar } from '../types';

/**
 * Qué roles responden por cada punto (`GET /alcance/responsables`).
 *
 * Una sola lectura por carga del módulo, igual que el alcance: es la misma
 * matriz para todos los procesos y cambia solo cuando alguien la configura.
 */
let actual: ResponsableDeLugar[] | null = null;
let pedido: Promise<ResponsableDeLugar[]> | null = null;

function cargar(): Promise<ResponsableDeLugar[]> {
  if (!pedido) {
    // Dentro de la promesa: si pedirlo falla de forma síncrona es el mismo caso
    // que un fallo de red, y no debe tumbar la pantalla.
    pedido = Promise.resolve()
      .then(() => contratacionService.responsables())
      .then((datos) => {
        actual = datos ?? [];
        return actual;
      })
      .catch(() => {
        // Sin la matriz se sigue nombrando a las personas a cargo; se deja
        // reintentar en la siguiente carga en vez de fijar el fallo.
        pedido = null;
        return [];
      });
  }
  return pedido;
}

/** Para las pruebas. */
export function olvidarResponsables(): void {
  actual = null;
  pedido = null;
}

/** Los responsables de cada punto; vacío mientras llegan. */
export function useResponsables(): ResponsableDeLugar[] {
  const [datos, setDatos] = useState<ResponsableDeLugar[]>(actual ?? []);

  useEffect(() => {
    if (actual) return;
    let vigente = true;
    void cargar().then((d) => vigente && setDatos(d));
    return () => {
      vigente = false;
    };
  }, []);

  return datos;
}

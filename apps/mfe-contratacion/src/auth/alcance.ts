import { useEffect, useSyncExternalStore } from 'react';

import { contratacionService } from '../services/contratacionService';
import { AccionAlcance, AlcanceMio, AlcanceVista } from '../types';
import { tienePermiso } from './permisos';

/**
 * Qué puede hacer quien mira, y dónde (migración 083).
 *
 * Los permisos del módulo son cuatro acciones —ver, editar, aprobar,
 * decidir— y cada rol las tiene en unos lugares: una etapa entera, un punto,
 * un trámite o todo el módulo. La pantalla pregunta «¿puede editar la 4.2?» y
 * no «¿tiene `presupuesto.gestionar`?».
 *
 * La regla es la misma del backend (`auth/alcance.ts` del servicio) y se repite
 * aquí porque el microfrontend no puede importarlo; las pruebas de los dos
 * lados fijan los mismos casos para que no se separen.
 *
 * Esconder no es la protección —el guard sigue negando lo que corresponda—,
 * así que mientras el alcance no ha llegado, o si no se pudo leer, se responde
 * que sí, con el mismo criterio de `tienePermiso`: una pantalla vacía sin
 * explicación es peor que un botón de más.
 */

// ------------------------------------------------------------- la regla --

const PATRON_NUMERAL = /^(\d{1,2})\.(\d{1,2})$/;
const PATRON_ETAPA = /^E(\d{1,2})$/;
const TRAMITES = ['INC.1', 'INC.2'];

const LA_SATISFACEN: Record<AccionAlcance, AccionAlcance[]> = {
  // Editar, aprobar o decidir en un punto implican verlo.
  ver: ['ver', 'editar', 'aprobar', 'decidir'],
  editar: ['editar'],
  aprobar: ['aprobar'],
  decidir: ['decidir'],
};

/** Si un lugar de alcance cubre el destino. */
export function cubre(lugar: string, destino: string): boolean {
  if (lugar === 'TODO') return true;
  if (destino === 'TODO') return false;
  // El incumplimiento no cuelga de la etapa 9: solo su fila o todo el módulo.
  if (TRAMITES.includes(destino)) return lugar === destino;
  // Una etapa entera solo la cubre una fila de etapa.
  if (PATRON_ETAPA.test(destino)) return lugar === destino;

  const punto = PATRON_NUMERAL.exec(destino);
  if (punto) return lugar === destino || lugar === `E${Number(punto[1])}`;
  return false;
}

/** Si con esos alcances se puede hacer la acción en el destino (o en alguna parte). */
export function puede(alcances: AlcanceVista[], accion: AccionAlcance, destino?: string): boolean {
  const validas = LA_SATISFACEN[accion];
  return alcances.some(
    (a) => validas.includes(a.accion) && (destino === undefined || cubre(a.lugar, destino)),
  );
}

// ------------------------------------------------------------ el almacén --

let actual: AlcanceMio | null = null;
let pedido: Promise<AlcanceMio | null> | null = null;
const oyentes = new Set<() => void>();

const avisar = () => oyentes.forEach((o) => o());

/** Lee el alcance de quien mira, una sola vez por carga del módulo. */
export function cargarAlcance(): Promise<AlcanceMio | null> {
  if (!pedido) {
    // Dentro de la promesa y no antes: si pedirlo falla de forma síncrona, es
    // el mismo caso que un fallo de red y no debe tumbar el componente.
    pedido = Promise.resolve()
      .then(() => contratacionService.alcanceMio())
      .then((datos) => {
        actual = datos;
        avisar();
        return datos;
      })
      .catch(() => {
        // Sin alcance se responde que sí, y el guard sigue negando. Se deja
        // reintentar en la siguiente carga en vez de fijar el fallo.
        pedido = null;
        return null;
      });
  }
  return pedido;
}

/** Para las pruebas, y para el día que el shell avise de un cambio de sesión. */
export function olvidarAlcance(): void {
  actual = null;
  pedido = null;
  avisar();
}

/** Para las pruebas: fija el alcance sin pedirlo. */
export function fijarAlcance(datos: AlcanceMio | null): void {
  actual = datos;
  pedido = Promise.resolve(datos);
  avisar();
}

/** Si quien mira puede hacer la acción en el destino. Ante la duda, sí. */
export function puedeEn(accion: AccionAlcance, destino?: string): boolean {
  if (!actual) return true;
  return puede(actual.alcances, accion, destino);
}

/**
 * Si tiene un permiso transversal (configurar, informes, ver todos…).
 *
 * Mientras el alcance no llega se cae a la sesión del shell, que ya traía
 * los permisos: esos cinco no cambiaron de código.
 */
export function tieneTransversal(permiso: string): boolean {
  if (!actual) return tienePermiso(permiso);
  return actual.transversales.includes(permiso);
}

/**
 * El alcance dentro de un componente: se vuelve a pintar cuando llega.
 *
 * `puede` y `tiene` son las mismas funciones de arriba; el hook solo hace que
 * el componente se entere de que el alcance cambió.
 */
export function useAlcance() {
  const datos = useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
    () => actual,
  );

  useEffect(() => {
    void cargarAlcance();
  }, []);

  return { cargado: datos !== null, puede: puedeEn, tiene: tieneTransversal };
}

/**
 * Si quien mira solo mueve presupuesto: la Dirección Financiera.
 *
 * Su trabajo no es un proceso sino una cola —las solicitudes de CDP—, así que
 * entra por su bandeja y ve el recorrido recortado a lo suyo. Se decide por lo
 * que *no* tiene: quien además diligencia el estudio previo, solicita el CDP o
 * revisa en la 3.4 trabaja procesos, y entonces la lista sí es su trabajo.
 *
 * `aprobar` se mira en la 3.4 y no en cualquier parte porque la Financiera
 * aprueba en la 9.5 —el respaldo de las modificaciones— sin dejar de ser solo
 * presupuesto.
 */
export function esSoloPresupuesto(puedeAqui: typeof puedeEn = puedeEn): boolean {
  return (
    puedeAqui('editar', '4.2') &&
    !puedeAqui('editar', '4.1') &&
    !puedeAqui('editar', '3.1') &&
    !puedeAqui('aprobar', '3.4')
  );
}

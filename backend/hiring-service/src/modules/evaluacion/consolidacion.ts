/**
 * Consolidación de la evaluación (EFDS-1157).
 *
 * Funciones puras y sin acceso a base: los criterios, los juicios y los valores
 * entran como parámetros. Decidir quién queda habilitado y con cuánto puntaje
 * es la clase de lógica que hay que poder probar contra casos conocidos —un
 * habilitante incumplido, una dimensión sin evaluar, dos ofertas al mismo
 * precio— sin levantar Postgres.
 *
 * Los puntajes se trabajan como números y se redondean a dos decimales al
 * final: acumular redondeos por criterio haría que dos ofertas con la misma
 * calificación salieran distintas.
 */

import { DimensionEvaluacion, TipoCriterio } from '../../entities/criterio-evaluacion.entity';

/** Cómo queda una oferta al consolidar lo evaluado. */
export type EstadoOferta = 'HABILITADA' | 'NO_HABILITADA' | 'PENDIENTE';

export interface CriterioAplicable {
  id: string;
  dimension: DimensionEvaluacion;
  tipo: TipoCriterio;
  nombre: string;
  puntajeMaximo: number | null;
}

export interface ResultadoEvaluado {
  criterioId: string;
  cumple: boolean | null;
  puntaje: number | null;
  observacion: string | null;
}

export interface OfertaEvaluada {
  id: string;
  valorOfertado: number | null;
  /** Dimensiones ya evaluadas, con el resultado de cada criterio. */
  evaluaciones: { dimension: DimensionEvaluacion; resultados: ResultadoEvaluado[] }[];
}

export interface Incumplimiento {
  criterioId: string;
  nombre: string;
  motivo: string | null;
}

export interface OfertaConsolidada {
  ofertaId: string;
  estado: EstadoOferta;
  /** Qué criterio la dejó fuera; es lo que el oferente reclama. */
  incumplimientos: Incumplimiento[];
  /** Dimensiones que todavía nadie evaluó. */
  dimensionesPendientes: DimensionEvaluacion[];
  puntajePorDimension: Record<string, number>;
  puntajeTotal: number;
  puntajeMaximo: number;
}

/** Las que califica una persona; la económica se calcula sobre el precio. */
const DIMENSIONES_MANUALES: DimensionEvaluacion[] = ['JURIDICO', 'FINANCIERO', 'TECNICO'];

const redondear = (valor: number) => Math.round(valor * 100) / 100;

/** Suma de los máximos ponderables: el total contra el que se lee la nota. */
export function puntajeMaximoDe(criterios: CriterioAplicable[]): number {
  return redondear(
    criterios
      .filter((c) => c.tipo === 'PONDERABLE')
      .reduce((total, c) => total + (c.puntajeMaximo ?? 0), 0),
  );
}

/**
 * Consolida todas las ofertas del proceso.
 *
 * Se hace en bloque y no oferta por oferta porque la calificación económica es
 * relativa: depende del menor valor **entre las habilitadas**, así que hasta no
 * saber quién queda habilitado no se puede puntuar el precio de nadie.
 */
export function consolidar(
  ofertas: OfertaEvaluada[],
  criterios: CriterioAplicable[],
): OfertaConsolidada[] {
  const maximo = puntajeMaximoDe(criterios);
  const base = new Map(criterios.map((c) => [c.id, c]));

  // Primera pasada: habilitación y puntaje de lo que evalúan las personas.
  const parcial = ofertas.map((oferta) => evaluarManuales(oferta, criterios, base));

  // El precio se compara solo contra quienes siguen en carrera: una oferta
  // descartada por no cumplir un habilitante no puede fijar el precio de
  // referencia de las demás.
  //
  // Se filtra por los incumplimientos y no por `estado`, que en esta pasada
  // todavía es provisional —lo definitivo lo fija `terminar`— y dejaría pasar a
  // las descartadas. Una oferta a medio evaluar sí cuenta: puede terminar
  // habilitada, y excluirla movería la base cada vez que alguien evalúa.
  const enCarrera = parcial.filter((p) => p.incumplimientos.length === 0);
  const menorValor = menorValorEntre(enCarrera.map((p) => p.oferta.valorOfertado));

  const criteriosEconomicos = criterios.filter(
    (c) => c.dimension === 'ECONOMICO' && c.tipo === 'PONDERABLE',
  );

  return parcial.map((p) => {
    const consolidada: OfertaConsolidada = {
      ofertaId: p.oferta.id,
      estado: p.estado,
      incumplimientos: p.incumplimientos,
      dimensionesPendientes: [...p.dimensionesPendientes],
      puntajePorDimension: { ...p.puntajePorDimension },
      puntajeTotal: p.puntajeParcial,
      puntajeMaximo: maximo,
    };

    if (criteriosEconomicos.length === 0) return terminar(consolidada);

    // Sin precio no hay nada que calcular, y sin base de comparación tampoco:
    // se deja pendiente en vez de puntuar cero, que sería decir que la oferta
    // es la más cara del mundo.
    if (p.oferta.valorOfertado == null || menorValor == null) {
      if (p.estado !== 'NO_HABILITADA') {
        consolidada.dimensionesPendientes.push('ECONOMICO');
      }
      return terminar(consolidada);
    }

    const puntaje = puntajeEconomico(
      p.oferta.valorOfertado,
      menorValor,
      puntajeMaximoDe(criteriosEconomicos),
    );
    consolidada.puntajePorDimension.ECONOMICO = puntaje;
    consolidada.puntajeTotal = redondear(consolidada.puntajeTotal + puntaje);

    return terminar(consolidada);
  });
}

/**
 * Puntaje del precio: proporción respecto de la oferta más barata.
 *
 * La más barata se lleva el máximo y las demás bajan en proporción directa; una
 * oferta del doble de precio obtiene la mitad del puntaje.
 *
 * SUPUESTO POR CONFIRMAR (EFDS-1445): la norma admite otras fórmulas —media
 * geométrica, media aritmética— y la elegida cambia quién gana. Se toma esta
 * por ser la más simple de explicar y de auditar, no porque conste en ningún
 * documento fuente.
 */
export function puntajeEconomico(valor: number, menorValor: number, maximo: number): number {
  if (valor <= 0 || menorValor <= 0) return 0;
  return redondear(maximo * Math.min(menorValor / valor, 1));
}

function menorValorEntre(valores: (number | null)[]): number | null {
  const presentes = valores.filter((v): v is number => v != null && v > 0);
  return presentes.length > 0 ? Math.min(...presentes) : null;
}

/** Una oferta con criterios incumplidos queda fuera pase lo que pase. */
function terminar(consolidada: OfertaConsolidada): OfertaConsolidada {
  if (consolidada.incumplimientos.length > 0) {
    consolidada.estado = 'NO_HABILITADA';
    return consolidada;
  }
  consolidada.estado = consolidada.dimensionesPendientes.length > 0 ? 'PENDIENTE' : 'HABILITADA';
  return consolidada;
}

function evaluarManuales(
  oferta: OfertaEvaluada,
  criterios: CriterioAplicable[],
  base: Map<string, CriterioAplicable>,
) {
  const incumplimientos: Incumplimiento[] = [];
  const dimensionesPendientes: DimensionEvaluacion[] = [];
  const puntajePorDimension: Record<string, number> = {};
  let puntajeParcial = 0;

  for (const dimension of DIMENSIONES_MANUALES) {
    const deLaDimension = criterios.filter((c) => c.dimension === dimension);
    if (deLaDimension.length === 0) continue;

    const evaluacion = oferta.evaluaciones.find((e) => e.dimension === dimension);
    if (!evaluacion) {
      dimensionesPendientes.push(dimension);
      continue;
    }

    let puntajeDimension = 0;
    for (const resultado of evaluacion.resultados) {
      const criterio = base.get(resultado.criterioId);
      if (!criterio) continue;

      if (criterio.tipo === 'HABILITANTE') {
        if (resultado.cumple === false) {
          incumplimientos.push({
            criterioId: criterio.id,
            nombre: criterio.nombre,
            motivo: resultado.observacion,
          });
        }
        continue;
      }
      puntajeDimension += resultado.puntaje ?? 0;
    }

    puntajePorDimension[dimension] = redondear(puntajeDimension);
    puntajeParcial += puntajeDimension;
  }

  return {
    oferta,
    // Provisional: `terminar` decide el definitivo cuando ya se sabe si falta
    // la económica.
    estado: 'PENDIENTE' as EstadoOferta,
    incumplimientos,
    dimensionesPendientes,
    puntajePorDimension,
    puntajeParcial: redondear(puntajeParcial),
  };
}

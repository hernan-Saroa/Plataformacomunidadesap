import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { DimensionEvaluacion } from './criterio-evaluacion.entity';

/**
 * Borrador es el informe generado y todavía no publicado; trasladado es el que
 * ya se les notificó a los oferentes y tiene término corriendo; cerrado es el
 * que agotó el traslado. Anulado no se borra: es el que explica por qué hubo
 * que rehacerlo.
 */
export type EstadoInforme = 'BORRADOR' | 'TRASLADADO' | 'CERRADO' | 'ANULADO';

/**
 * Cómo quedó una oferta en el informe, con la forma en que se congela.
 *
 * Es una copia de lo que devolvía la consolidación (EFDS-1442) el día del
 * traslado, no una referencia a ella: los nombres de los criterios viajan con
 * el resultado para que retirar uno del catálogo no deje el informe mudo.
 */
export interface OfertaEnInforme {
  ofertaId: string;
  numero: number;
  nombre: string;
  identificacion: string;
  valorOfertado: number | null;
  estado: 'HABILITADA' | 'NO_HABILITADA' | 'PENDIENTE';
  incumplimientos: { criterioId: string; nombre: string; motivo: string | null }[];
  puntajePorDimension: Partial<Record<DimensionEvaluacion, number>>;
  puntajeTotal: number;
  puntajeMaximo: number;
}

/** El consolidado congelado, con el contexto que hace falta para leerlo. */
export interface ResultadoInforme {
  modalidad: string | null;
  puntajeMaximo: number;
  /** Si al generarlo había criterios sin ratificar. Se dice en el informe. */
  criteriosSinConfirmar: boolean;
  ofertas: OfertaEnInforme[];
}

/**
 * Informe de evaluación del proceso (actividad 6.4, EFDS-1158).
 *
 * Congela su resultado a propósito. La consolidación se calcula al consultarla
 * —corregir un juicio tiene que reflejarse sin rehacer nada—, pero el informe
 * es una pieza notificada: si mañana un evaluador corrige algo, lo que recibió
 * el oferente no puede cambiar detrás de él. Lo que se mueve es la
 * consolidación viva; el informe queda como estaba.
 */
@Entity('informes_evaluacion', { schema: 'hiring' })
@Unique('uq_informe_numero', ['procesoId', 'numero'])
export class InformeEvaluacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  /** Consecutivo dentro del proceso: un informe anulado y su reemplazo. */
  @Column({ type: 'int' })
  numero: number;

  @Column({ type: 'jsonb' })
  resultado: ResultadoInforme;

  /**
   * Cuántas ofertas quedaron habilitadas al generarlo.
   *
   * Sale del resultado, pero se guarda aparte porque es la pregunta que decide
   * si el proceso sigue o se declara desierto, y no se responde escarbando un
   * jsonb.
   */
  @Column({ name: 'ofertas_habilitadas', type: 'int', default: 0 })
  ofertasHabilitadas: number;

  @Column({ length: 20, default: 'BORRADOR' })
  estado: EstadoInforme;

  @Column({ name: 'informe_documento_id', type: 'uuid', nullable: true })
  informeDocumentoId: string | null;

  /** Soporte de la publicación: no hay integración con SECOP II. */
  @Column({ name: 'evidencia_documento_id', type: 'uuid', nullable: true })
  evidenciaDocumentoId: string | null;

  @Column({ name: 'generado_por', length: 120, nullable: true })
  generadoPor: string | null;

  @Column({ name: 'generado_at', type: 'timestamptz', default: () => 'now()' })
  generadoAt: Date;

  @Column({ name: 'trasladado_por', length: 120, nullable: true })
  trasladadoPor: string | null;

  @Column({ name: 'trasladado_at', type: 'timestamptz', nullable: true })
  trasladadoAt: Date | null;

  /** Plazo aplicado, congelado al trasladar. */
  @Column({ name: 'plazo_dias_habiles', type: 'int', nullable: true })
  plazoDiasHabiles: number | null;

  /**
   * Hasta cuándo se reciben subsanaciones, sin hora.
   *
   * A diferencia del plazo de ofertas, este término se cuenta en días hábiles y
   * vence al final del día: `YYYY-MM-DD` como el resto de plazos del módulo.
   */
  @Column({ name: 'vence_el', type: 'date', nullable: true })
  venceEl: string | null;

  @Column({ name: 'cerrado_por', length: 120, nullable: true })
  cerradoPor: string | null;

  @Column({ name: 'cerrado_at', type: 'timestamptz', nullable: true })
  cerradoAt: Date | null;

  @Column({ name: 'anulado_at', type: 'timestamptz', nullable: true })
  anuladoAt: Date | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

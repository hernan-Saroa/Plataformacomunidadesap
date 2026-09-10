import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/** Etapa 6 — Recepción y Evaluación de Ofertas. */
export const ETAPA_RECEPCION = 6;

/**
 * Abierta y cerrada son dos hechos distintos: mientras la recepción está
 * abierta se agregan oferentes, y el cierre congela la lista y la publica.
 * De ahí que el registro de una oferta dependa del estado y no solo del plazo.
 */
export type EstadoRecepcion = 'ABIERTA' | 'CERRADA';

@Entity('recepciones_ofertas', { schema: 'hiring' })
@Unique('uq_recepcion_proceso', ['procesoId'])
export class RecepcionOfertas {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  /**
   * Hasta cuándo se reciben ofertas, con hora.
   *
   * A diferencia del resto de fechas del módulo, esta lleva hora: las ofertas
   * se reciben "hasta las 10:00 a.m. del día X", y una radicada esa mañana
   * llega a tiempo mientras que la de la tarde no.
   */
  @Column({ type: 'timestamptz' })
  vencimiento: Date;

  /**
   * Plazo aplicado, congelado al fijarse.
   *
   * Nulo cuando la modalidad no tiene plazo parametrizado y el vencimiento se
   * fijó a mano en la apertura.
   */
  @Column({ name: 'plazo_dias_habiles', type: 'int', nullable: true })
  plazoDiasHabiles: number | null;

  @Column({ length: 20, default: 'ABIERTA' })
  estado: EstadoRecepcion;

  /** Cuándo se cerró; es la fecha con la que queda publicada la lista. */
  @Column({ name: 'cerrada_at', type: 'timestamptz', nullable: true })
  cerradaAt: Date | null;

  @Column({ name: 'cerrada_por', length: 200, nullable: true })
  cerradaPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

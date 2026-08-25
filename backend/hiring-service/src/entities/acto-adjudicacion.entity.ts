import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Etapa 7 — Adjudicación. También la etapa de la declaratoria desierta. */
export const ETAPA_ADJUDICACION = 7;

/**
 * Revocado no se borra: el acto pudo notificarse y publicarse, y hay terceros
 * que lo conocieron. Mismo criterio del resultado rectificado.
 */
export type EstadoActo = 'VIGENTE' | 'REVOCADO';

/**
 * Acto de adjudicación — actividad 7.4 (EFDS-1159).
 *
 * La resolución del Ordenador del Gasto. Aquí termina el proceso de selección:
 * lo que sigue es contrato.
 *
 * Quién adjudica es el Ordenador del Gasto y no el gestor, con la misma
 * separación de la designación del comité (EFDS-1438): el gestor lleva el
 * trámite, pero comprometer a la entidad con un tercero es de quien ordena el
 * gasto.
 */
@Entity('actos_adjudicacion', { schema: 'hiring' })
export class ActoAdjudicacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  /**
   * El informe sobre el que se adjudica. Adjudicar sin él sería firmar sobre
   * una evaluación que todavía se podía mover.
   */
  @Column({ name: 'informe_definitivo_id' })
  informeDefinitivoId: string;

  /**
   * A quién se le adjudica.
   *
   * Con llave a las ofertas del proceso: un nombre escrito a mano en un acto de
   * adjudicación es el error que no se puede cometer aquí.
   */
  @Column({ name: 'oferente_id' })
  oferenteId: string;

  @Column({ name: 'numero_acto', length: 60 })
  numeroActo: string;

  @Column({ name: 'fecha_acto', type: 'date' })
  fechaActo: string;

  /**
   * Por cuánto se adjudica.
   *
   * Puede no ser el valor ofertado ni el evaluado: el acto puede adjudicar por
   * un valor ajustado, y lo que obliga a la entidad es lo que dice el acto.
   */
  @Column({ name: 'valor_adjudicado', type: 'numeric', precision: 18, scale: 2 })
  valorAdjudicado: string;

  /** La resolución firmada. Obligatoria: sin ella no hay adjudicación. */
  @Column({ name: 'acto_documento_id' })
  actoDocumentoId: string;

  @Column({ name: 'notificado_at', type: 'timestamptz', nullable: true })
  notificadoAt: Date | null;

  @Column({ name: 'publicado_at', type: 'timestamptz', nullable: true })
  publicadoAt: Date | null;

  /** Soporte de la publicación: no hay integración con SECOP II. */
  @Column({ name: 'evidencia_documento_id', type: 'uuid', nullable: true })
  evidenciaDocumentoId: string | null;

  @Column({ length: 20, default: 'VIGENTE' })
  estado: EstadoActo;

  @Column({ name: 'emitido_por', length: 200, nullable: true })
  emitidoPor: string | null;

  @Column({ name: 'emitido_at', type: 'timestamptz', default: () => 'now()' })
  emitidoAt: Date;

  @Column({ name: 'revocado_at', type: 'timestamptz', nullable: true })
  revocadoAt: Date | null;

  @Column({ name: 'revocado_por', length: 200, nullable: true })
  revocadoPor: string | null;

  @Column({ name: 'motivo_revocacion', type: 'text', nullable: true })
  motivoRevocacion: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

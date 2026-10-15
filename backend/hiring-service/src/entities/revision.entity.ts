import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Los tres desenlaces de una revisión (EFDS-1183).
 *
 * `DEVUELTO` es «corrígelo y vuelve»: el trabajo regresa a quien lo hizo y el
 * proceso sigue vivo. `NEGADO` es «esto no procede»: no hay nada que corregir y
 * el proceso termina ahí. Devolver un proceso que la Dirección rechaza de plano
 * era mentirle al área, que se queda esperando saber qué corregir.
 */
export type DecisionRevision = 'APROBADO' | 'DEVUELTO' | 'NEGADO';

/**
 * Historial de revisiones de una actividad (numeral 3.4 de la matriz).
 * Se guarda una fila por decisión: un estudio previo puede devolverse varias
 * veces y hay que conservar el motivo de cada devolución.
 */
@Entity('revisiones', { schema: 'hiring' })
export class Revision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_actividad_id', type: 'uuid' })
  procesoActividadId: string;

  @Column({ length: 20 })
  decision: DecisionRevision;

  /** Obligatorio salvo al aprobar: sin motivo nadie sabe qué corregir, ni por qué se negó. */
  @Column({ type: 'text', nullable: true })
  observaciones: string;

  /** Versión sobre la que se pronunció el revisor. */
  @Column({ name: 'version_revisada', type: 'int' })
  versionRevisada: number;

  @Column({ name: 'revisado_por', length: 120 })
  revisadoPor: string;

  @Column({ name: 'revisado_por_id', length: 120, nullable: true })
  revisadoPorId: string;

  /**
   * Los archivos que acompañan una devolución (migraciones 091 y 093): las
   * correcciones marcadas sobre los documentos, en el orden en que se
   * adjuntaron. Son de esta vuelta, no de la actividad.
   */
  @Column({ name: 'soportes_documento_ids', type: 'uuid', array: true, default: () => "'{}'" })
  soportesDocumentoIds: string[];

  /**
   * La ronda y el escalón en que se decidió (migración 101). Nulos en las
   * decisiones anteriores, que fueron de un solo nivel, y en las de la 3.4,
   * que decide el abogado del proceso y no una cadena.
   */
  @Column({ name: 'aprobacion_id', type: 'uuid', nullable: true })
  aprobacionId: string | null;

  @Column({ type: 'int', nullable: true })
  escalon: number | null;

  /** La persona que decidió: así se designa en la configuración, no por la cuenta. */
  @Column({ name: 'persona_id', type: 'uuid', nullable: true })
  personaId: string | null;

  @Column({ name: 'estado_anterior', length: 30, nullable: true })
  estadoAnterior: string | null;

  @Column({ name: 'estado_resultante', length: 30, nullable: true })
  estadoResultante: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

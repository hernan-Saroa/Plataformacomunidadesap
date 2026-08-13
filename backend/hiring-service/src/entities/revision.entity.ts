import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type DecisionRevision = 'APROBADO' | 'DEVUELTO';

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

  /** Obligatorio cuando se devuelve: sin motivo el gestor no sabe qué corregir. */
  @Column({ type: 'text', nullable: true })
  observaciones: string;

  /** Versión sobre la que se pronunció el revisor. */
  @Column({ name: 'version_revisada', type: 'int' })
  versionRevisada: number;

  @Column({ name: 'revisado_por', length: 120 })
  revisadoPor: string;

  @Column({ name: 'revisado_por_id', length: 120, nullable: true })
  revisadoPorId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

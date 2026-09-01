import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Grupo: instancia INDEPENDIENTE de programación de una asignatura (RN-11).
 *
 * Primera entidad ESCRIBIBLE del servicio — vive en el esquema
 * `"academic-schedule"`, que sí es nuestro. El catálogo (`academic_work_plan`)
 * se sigue tratando como solo lectura.
 *
 * ⚠️ Sin unicidad contra (docente, asignatura): el AC-03 exige que el mismo
 * docente pueda dictar varios grupos de la misma asignatura. Lo que se prohíbe
 * es el cruce de franjas, y eso se valida sobre el horario (fase 3).
 */
@Entity({ schema: 'academic-schedule', name: 'grupo' })
export class GrupoEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_grupo' })
  idGrupo: string;

  @Column({ name: 'id_asignatura', type: 'bigint' })
  idAsignatura: string;

  @Column({ name: 'id_periodo', type: 'uuid', nullable: true })
  idPeriodo: string | null;

  @Column({ name: 'numero_grupo', type: 'smallint' })
  numeroGrupo: number;

  /** Nullable a propósito: el grupo se numera antes de asignar docente. */
  @Column({ name: 'id_docente', type: 'uuid', nullable: true })
  idDocente: string | null;

  @Column({ name: 'cupo_maximo', type: 'int', default: 30 })
  cupoMaximo: number;

  @Column({ type: 'varchar', length: 30, default: 'PROGRAMADO' })
  estado: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;
}

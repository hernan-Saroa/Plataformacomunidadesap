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
/** Mismo conjunto cerrado que el CHECK de la migración 036. */
export const TIPOS_OFERTA = ['periodo_regular', 'creditos_virtual', 'interperiodo'] as const;
export type TipoOferta = (typeof TIPOS_OFERTA)[number];

/**
 * Modalidad del GRUPO (migración 063). Virtual: sus sesiones son mediadas por
 * tecnología y sin aula, y el horario es OPCIONAL al crearlo: el docente asignado
 * lo define después en «Mi programación».
 */
export const MODALIDADES_GRUPO = ['presencial', 'virtual', 'distancia'] as const;
export type ModalidadGrupo = (typeof MODALIDADES_GRUPO)[number];

/**
 * Modalidades SIN AULA (065): virtual y a distancia funcionan igual — sesiones mediadas
 * por tecnología, sin aula, horario opcional que puede definir el docente asignado.
 */
export const MODALIDADES_SIN_AULA: readonly ModalidadGrupo[] = ['virtual', 'distancia'];
export const esSinAula = (m: unknown): boolean => MODALIDADES_SIN_AULA.includes(m as ModalidadGrupo);
/** Para SQL: `g.modalidad IN (${SQL_MODALIDADES_SIN_AULA})`. */
export const SQL_MODALIDADES_SIN_AULA = "'virtual', 'distancia'";

@Entity({ schema: 'academic-schedule', name: 'grupo' })
export class GrupoEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_grupo' })
  idGrupo: string;

  @Column({ name: 'id_asignatura', type: 'bigint' })
  idAsignatura: string;

  /** Periodo LEGADO (`periodo_programacion`). Se conserva para los no migrados. */
  @Column({ name: 'id_periodo', type: 'uuid', nullable: true })
  idPeriodo: string | null;

  /** Periodo de PLATAFORMA (`periodo_academico`, EFDS-2328). Manda sobre el legado. */
  @Column({ name: 'id_periodo_academico', type: 'bigint', nullable: true })
  idPeriodoAcademico: string | null;

  /** Oferta del grupo dentro del periodo de plataforma (migración 036). */
  @Column({ name: 'tipo_oferta', type: 'varchar', length: 30, nullable: true })
  tipoOferta: TipoOferta | null;

  /**
   * Dónde se dicta: la oferta de programa por CETAP del periodo (migración 040,
   * `academic_work_plan.oferta_cetap_programa`). De ella sale su territorial.
   */
  @Column({ name: 'id_oferta_cetap', type: 'bigint', nullable: true })
  idOfertaCetap: string | null;

  @Column({ name: 'numero_grupo', type: 'smallint' })
  numeroGrupo: number;

  /** Nullable a propósito: el grupo se numera antes de asignar docente. */
  @Column({ name: 'id_docente', type: 'uuid', nullable: true })
  idDocente: string | null;

  @Column({ type: 'varchar', length: 20, default: 'presencial' })
  modalidad: ModalidadGrupo;

  @Column({ name: 'cupo_maximo', type: 'int', default: 30 })
  cupoMaximo: number;

  @Column({ type: 'varchar', length: 30, default: 'PROGRAMADO' })
  estado: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  /** EFDS-1371: ventana del ciclo de clases, propia de CADA grupo. */
  @Column({ name: 'fecha_inicio', type: 'date', nullable: true })
  fechaInicio: string | null;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true })
  fechaFin: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;
}

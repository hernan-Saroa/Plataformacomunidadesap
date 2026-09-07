import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** Días L–D. Sin intervalos fijos: la hora es libre (AC-03). */
export const DIAS_SEMANA = [
  'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO',
] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

/**
 * Tipo de SESIÓN — no confundir con `asignatura.modalidad`.
 *
 * Este campo lo define el programador por sesión. La modalidad de la asignatura
 * es dato maestro del SNIES, de solo lectura y en otro esquema. Son ortogonales:
 * una asignatura `virtual` puede tener sesiones `presencial`.
 */
export const TIPOS_SESION = ['presencial', 'mediada_tecnologia'] as const;
export type TipoSesion = (typeof TIPOS_SESION)[number];

export const JORNADAS = ['DIURNA', 'NOCTURNA', 'FIN_DE_SEMANA'] as const;
export type Jornada = (typeof JORNADAS)[number];

@Entity({ schema: 'academic-schedule', name: 'franja_horaria' })
export class FranjaHorariaEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_franja' })
  idFranja: string;

  /** Dueño de la franja: el horario cuelga del GRUPO, no de la asignatura. */
  @Column({ name: 'id_grupo', type: 'uuid', nullable: true })
  idGrupo: string | null;

  @Column({ name: 'dia_semana', type: 'varchar', length: 15 })
  diaSemana: DiaSemana;

  /** 'HH:MM' o 'HH:MM:SS'. Arbitraria: 11:05 a 12:35 es válido (AC-03). */
  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin: string;

  @Column({ name: 'tipo_sesion', type: 'varchar', length: 30, default: 'presencial' })
  tipoSesion: TipoSesion;

  @Column({ type: 'varchar', length: 30, nullable: true })
  jornada: Jornada | null;

  /** Nullable: el horario se define antes de asignar salón. */
  @Column({ name: 'sede_codigo', type: 'varchar', length: 50, nullable: true })
  sedeCodigo: string | null;

  @Column({ name: 'aula_codigo', type: 'varchar', length: 50, nullable: true })
  aulaCodigo: string | null;

  @Column({ type: 'varchar', length: 30, default: 'PROGRAMADO' })
  estado: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;
}

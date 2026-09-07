import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Vista de SOLO LECTURA del catálogo de asignaturas (dueño: `academic_work_plan`).
 * Ver la nota de ProgramaCatalogoEntity: no se replica ni se escribe.
 */
@Entity({ schema: 'academic_work_plan', name: 'asignatura' })
export class AsignaturaCatalogoEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'id_programa', type: 'bigint' })
  idPrograma: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  /** Llave maestra del SNIES (RN-01). Puede faltar en registros heredados. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  codigo: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  pensum: string | null;

  @Column({ type: 'smallint' })
  creditos: number;

  /** FK a `ubicacion_semestral`: es lo que permite agrupar el catálogo por semestre. */
  @Column({ name: 'id_ubicacion_semestral', type: 'smallint' })
  idUbicacionSemestral: number;

  @Column({ type: 'varchar', length: 30, default: 'sin_definir' })
  modalidad: string;

  @Column({ name: 'horas_clase', type: 'int', nullable: true })
  horasClase: number | null;


  /** Horas del PTA, ya con el factor de carga aplicado. Se expone tal cual. */
  @Column({ name: 'horas_pta', type: 'int', nullable: true })
  horasPta: number | null;

  /** Excepción de la Circular 003: seminario_enfasis, opciones_grado_ap, seminario_opciones_apt. */
  @Column({ name: 'tipo_excepcion', type: 'varchar', length: 40, nullable: true })
  tipoExcepcion: string | null;

  @Column({ type: 'boolean', default: true })
  activa: boolean;
}

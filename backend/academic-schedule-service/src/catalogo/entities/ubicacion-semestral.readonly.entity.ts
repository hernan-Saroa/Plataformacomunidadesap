import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Semestre del plan de estudios (dueño: `academic_work_plan`). Solo lectura.
 * `orden` define la secuencia de presentación del catálogo agrupado (AC-01).
 */
@Entity({ schema: 'academic_work_plan', name: 'ubicacion_semestral' })
export class UbicacionSemestralCatalogoEntity {
  @PrimaryColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'varchar', length: 10 })
  codigo: string;

  @Column({ type: 'varchar', length: 30 })
  etiqueta: string;

  /** 'pregrado' | 'posgrado' */
  @Column({ name: 'tipo_programa', type: 'varchar', length: 20 })
  tipoPrograma: string;

  @Column({ type: 'smallint' })
  orden: number;
}

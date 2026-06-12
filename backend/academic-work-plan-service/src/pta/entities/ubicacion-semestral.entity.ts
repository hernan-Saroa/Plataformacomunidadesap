import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'ubicacion_semestral' })
export class UbicacionSemestralEntity {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'varchar', length: 10, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  etiqueta: string;

  @Column({ name: 'tipo_programa', type: 'varchar', length: 20 })
  tipoPrograma: string; // 'pregrado' | 'posgrado'

  @Column({ type: 'smallint' })
  orden: number;
}

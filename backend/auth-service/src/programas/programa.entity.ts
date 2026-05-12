import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'programas' })
export class ProgramaAcademico {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  codigo: string;

  @Column({ type: 'varchar', length: 500 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'nivel_formacion', type: 'varchar', length: 255, nullable: true })
  nivelFormacion?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  facultad?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  modalidad?: string;

  @Column({ type: 'integer', nullable: true })
  duracion?: number;

  @Column({ type: 'integer', nullable: true })
  creditos?: number;

  @Column({ name: 'costo_matricula', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costoMatricula?: number;

  @Column({ name: 'requisitos_de_ingreso', type: 'text', nullable: true })
  requisitosDeIngreso?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  jornada?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sede?: string;

  @Column({ name: 'registro_calificado', type: 'jsonb', nullable: true })
  registroCalificado?: any;

  @Column({ name: 'perfil_egresado', type: 'text', nullable: true })
  perfilEgresado?: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVO' })
  estado: string;

  @Column({ name: 'created_at', type: 'timestamp with time zone', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp with time zone', default: () => 'NOW()' })
  updatedAt: Date;

  // Virtual properties for calculated plan de estudios stats (populated by service)
  totalAsignaturas?: number;
  creditosPlan?: number;
}

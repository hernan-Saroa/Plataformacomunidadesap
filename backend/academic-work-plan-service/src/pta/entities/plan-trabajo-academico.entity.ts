import { 
  Column,
  Entity,
  PrimaryGeneratedColumn,
  BeforeInsert, BeforeUpdate 
} from 'typeorm';

@Entity({ schema: 'academic_work_plan', name: 'PlanTrabajoAcademico' })
export class PlanTrabajoAcademicoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'docenteId', type: 'text' })
  docenteId: string;

  @Column({ type: 'text' })
  periodo: string;

  @Column({ type: 'text', default: 'BORRADOR' })
  estado: string;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({ name: 'horasTotales', type: 'int', default: 0 })
  horasTotales: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'motivoDevolucion', type: 'text', nullable: true })
  motivoDevolucion: string | null;

  @Column({ name: 'datosEstructurados', type: 'jsonb', nullable: true })
  datosEstructurados: any | null;

  @Column({ type: 'text', nullable: true })
  dedicacion: string | null;

  @Column({ name: 'horasAsignables', type: 'int', nullable: true })
  horasAsignables: number | null;

  @Column({ name: 'semanasVinculacion', type: 'int', nullable: true })
  semanasVinculacion: number | null;

  @Column({ name: 'tipoVinculacion', type: 'text', nullable: true })
  tipoVinculacion: string | null;

  @Column({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}

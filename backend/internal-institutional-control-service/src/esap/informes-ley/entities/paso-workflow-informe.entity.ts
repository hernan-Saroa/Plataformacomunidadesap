import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { WorkflowAprobacionInforme } from './workflow-aprobacion-informe.entity';

@Entity('paso_workflow_informe', { schema: 'control_interno' })
@Index(['workflowId', 'numeroPaso'])
export class PasoWorkflowInforme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'workflow_id', nullable: false })
  workflowId: string;

  @ManyToOne(() => WorkflowAprobacionInforme, (workflow) => workflow.pasos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflow_id' })
  workflow: WorkflowAprobacionInforme;

  @Column({ type: 'integer', name: 'numero_paso', nullable: false })
  numeroPaso: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  nombre: string; // 'elaboracion', 'revision', 'aprobacion', 'publicacion'

  @Column({ type: 'varchar', length: 255, name: 'nombre_display', nullable: false })
  nombreDisplay: string; // 'Elaboración', 'Revisión Técnica', etc.

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  responsable?: string;

  @Column({ type: 'varchar', length: 255, name: 'rol_responsable', nullable: true })
  rolResponsable?: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'pendiente',
  })
  estado: 'pendiente' | 'en-proceso' | 'completado' | 'rechazado';

  @Column({ type: 'timestamp', name: 'fecha_inicio', nullable: true })
  fechaInicio?: Date;

  @Column({ type: 'timestamp', name: 'fecha_fin', nullable: true })
  fechaFin?: Date;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  accion?: 'elaborar' | 'revisar' | 'aprobar' | 'publicar';

  @Column({ type: 'boolean', name: 'es_obligatorio', default: true })
  esObligatorio: boolean;

  @Column({ type: 'integer', nullable: false })
  orden: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

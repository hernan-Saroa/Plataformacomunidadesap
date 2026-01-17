import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EntregaInformeLey } from './entrega-informe-ley.entity';
import { PasoWorkflowInforme } from './paso-workflow-informe.entity';

@Entity('workflow_aprobacion_informe', { schema: 'control_interno' })
@Index(['entregaId'])
@Index(['estadoWorkflow'])
export class WorkflowAprobacionInforme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'entrega_id', nullable: false })
  entregaId: string;

  @ManyToOne(() => EntregaInformeLey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entrega_id' })
  entrega: EntregaInformeLey;

  @Column({ type: 'integer', name: 'paso_actual', default: 1 })
  pasoActual: number;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'estado_workflow',
    default: 'en-elaboracion',
  })
  estadoWorkflow: 'en-elaboracion' | 'en-revision' | 'en-aprobacion' | 'aprobado' | 'rechazado' | 'completado';

  @Column({ type: 'boolean', default: false })
  completado: boolean;

  @Column({ type: 'timestamp', name: 'fecha_completado', nullable: true })
  fechaCompletado?: Date;

  @Column({ type: 'varchar', length: 255, name: 'creado_por', nullable: true })
  creadoPor?: string;

  @OneToMany(() => PasoWorkflowInforme, (paso) => paso.workflow, { cascade: true })
  pasos: PasoWorkflowInforme[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

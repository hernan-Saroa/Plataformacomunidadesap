import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { AuditoriaProgramada } from './auditoria-programada.entity';

@Entity('plan_anual', { schema: 'control_interno' })
@Index(['año'])
@Index(['estado'])
export class ProgramaAnual {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', nullable: false })
  año: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'borrador',
  })
  estado: 'borrador' | 'aprobado' | 'en-ejecucion' | 'cerrado';

  @Column({ name: 'fecha_creacion', type: 'date', nullable: false })
  fechaCreacion: Date;

  @Column({ name: 'fecha_aprobacion', type: 'date', nullable: true })
  fechaAprobacion?: Date;

  @Column({ name: 'creado_por', type: 'varchar', length: 255, nullable: false })
  creadoPor: string;

  @Column({ type: 'varchar', length: 50, default: '1.0' })
  version: string;

  @Column({ name: 'total_actividades', type: 'integer', default: 0 })
  totalActividades: number;

  @Column({ name: 'actividades_completadas', type: 'integer', default: 0 })
  actividadesCompletadas: number;

  @Column({ name: 'porcentaje_cumplimiento', type: 'integer', default: 0 })
  porcentajeCumplimiento: number;

  @Column({ type: 'jsonb', nullable: true })
  enfoques?: any;

  @OneToMany(() => AuditoriaProgramada, (auditoria) => auditoria.programaAnual)
  auditorias: AuditoriaProgramada[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


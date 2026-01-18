import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

@Entity('tipo_auditoria', { schema: 'control_interno' })
@Index(['codigo'], { unique: true })
@Index(['activa'])
@Index(['deletedAt'], { where: 'deleted_at IS NULL' })
export class TipoAuditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'text', nullable: true })
  alcance?: string;

  @Column({ name: 'duracion_promedio', type: 'integer', default: 30 })
  duracionPromedio: number;

  @Column({ name: 'equipo_promedio', type: 'integer', default: 3 })
  equipoPromedio: number;

  @Column({ type: 'varchar', length: 7, default: '#3B82F6' })
  color: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ name: 'auditorias_programadas', type: 'integer', default: 0 })
  auditoriasProgramadas: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}

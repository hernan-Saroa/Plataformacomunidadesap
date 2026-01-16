import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { EntregaInformeLey } from './entrega-informe-ley.entity';

@Entity('historial_generacion_informe', { schema: 'control_interno' })
@Index(['entregaId'])
@Index(['accion'])
@Index(['createdAt'])
export class HistorialGeneracionInforme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'entrega_id', nullable: false })
  entregaId: string;

  @ManyToOne(() => EntregaInformeLey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entrega_id' })
  entrega: EntregaInformeLey;

  @Column({ type: 'varchar', length: 100, nullable: false })
  accion: string; // 'generado', 'actualizado', 'enviado_aprobacion', 'aprobado', 'rechazado'

  @Column({ type: 'varchar', length: 255, name: 'usuario_id', nullable: true })
  usuarioId?: string;

  @Column({ type: 'varchar', length: 255, name: 'usuario_nombre', nullable: true })
  usuarioNombre?: string;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({ type: 'jsonb', name: 'datos_anteriores', nullable: true })
  datosAnteriores?: Record<string, any>;

  @Column({ type: 'jsonb', name: 'datos_nuevos', nullable: true })
  datosNuevos?: Record<string, any>;

  @Column({ type: 'varchar', length: 50, name: 'ip_origen', nullable: true })
  ipOrigen?: string;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

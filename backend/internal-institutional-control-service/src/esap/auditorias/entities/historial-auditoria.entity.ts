import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Auditoria } from './auditoria.entity';

export enum TipoEvento {
  CREACION = 'creacion',
  CAMBIO_ESTADO = 'cambio_estado',
  ASIGNACION = 'asignacion',
  ACTUALIZACION = 'actualizacion',
  DOCUMENTO = 'documento',
  HALLAZGO = 'hallazgo',
  NOTA = 'nota',
  APROBACION = 'aprobacion',
  FINALIZACION = 'finalizacion',
  ELIMINACION = 'eliminacion',
  ARCHIVO = 'archivo',
  AMPLIACION_PLAZO = 'ampliacion_plazo',
}

@Entity('historial_auditoria', { schema: 'control_interno' })
@Index(['auditoriaId'])
@Index(['usuarioId'])
@Index(['tipoEvento'])
@Index(['fecha', 'hora'])
export class HistorialAuditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'auditoria_id', type: 'uuid', nullable: false })
  auditoriaId: string;

  @ManyToOne(() => Auditoria, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditoria_id' })
  auditoria: Auditoria;

  @Column({
    name: 'tipo_evento',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  tipoEvento: TipoEvento;

  @Column({ type: 'date', nullable: false })
  fecha: Date;

  @Column({ type: 'time', nullable: false })
  hora: string;

  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuarioId: string | null; // FK a auth.personas (UUID) - puede ser null

  @Column({ type: 'varchar', length: 255, nullable: false })
  accion: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({ name: 'documento_adjunto', type: 'varchar', length: 500, nullable: true })
  documentoAdjunto?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  cambios: Array<{
    campo: string;
    valorAnterior: string;
    valorNuevo: string;
  }>;

  @Column({ name: 'estado_anterior', type: 'varchar', length: 50, nullable: true })
  estadoAnterior?: string;

  @Column({ name: 'estado_nuevo', type: 'varchar', length: 50, nullable: true })
  estadoNuevo?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}










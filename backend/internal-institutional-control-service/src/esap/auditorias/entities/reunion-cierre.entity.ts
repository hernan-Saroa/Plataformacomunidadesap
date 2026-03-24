import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Auditoria } from './auditoria.entity';
import { Documento } from '../../documentos/entities/documento.entity';

export type ModalidadReunion = 'presencial' | 'virtual' | 'hibrida';
export type EstadoActa = 'pendiente' | 'en_elaboracion' | 'firmada' | 'aprobada';

@Entity('reunion_cierre', { schema: 'control_interno' })
@Index(['auditoriaId'])
export class ReunionCierre {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'auditoria_id', type: 'uuid' })
  auditoriaId: string;

  @ManyToOne(() => Auditoria, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditoria_id' })
  auditoria: Auditoria;

  @Column({ type: 'timestamp without time zone' })
  fecha: Date;

  @Column({ type: 'varchar', length: 50 })
  modalidad: ModalidadReunion;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lugar?: string;

  @Column({ name: 'enlace_virtual', type: 'varchar', length: 500, nullable: true })
  enlaceVirtual?: string;

  @Column({ type: 'jsonb', nullable: true })
  agenda?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  participantes?: string[] | Record<string, unknown>;

  @Column({ name: 'estado_acta', type: 'varchar', length: 50, default: 'pendiente' })
  estadoActa: EstadoActa;

  @Column({ name: 'acta_ruta', type: 'varchar', length: 500, nullable: true })
  actaRuta?: string;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({ name: 'elaborado_por', type: 'varchar', length: 255, nullable: true })
  elaboradoPor?: string;

  @Column({ name: 'revisado_por', type: 'varchar', length: 255, nullable: true })
  revisadoPor?: string;

  @Column({ name: 'documento_biblioteca_id', type: 'uuid', nullable: true })
  documentoBibliotecaId?: string;

  @ManyToOne(() => Documento, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'documento_biblioteca_id' })
  documentoBiblioteca?: Documento;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

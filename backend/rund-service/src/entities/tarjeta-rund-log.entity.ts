import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocenteEntity } from './docente.entity';

@Entity({ name: 'tarjeta_rund_log', schema: 'rund' })
export class TarjetaRundLogEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_log' })
  idLog: string;

  @Column({ type: 'uuid', name: 'id_docente' })
  idDocente: string;

  @ManyToOne(() => DocenteEntity, (d) => d.tarjetasLog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_docente' })
  docente: DocenteEntity;

  @Column({ type: 'varchar', length: 100, name: 'codigo_verificacion', unique: true })
  codigoVerificacion: string;

  @Column({ type: 'text', name: 'qr_code_payload' })
  qrCodePayload: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_emision' })
  fechaEmision: Date;

  @Column({ type: 'uuid', name: 'emitido_por', nullable: true })
  emitidoPor?: string;

  @Column({ type: 'int', name: 'version', default: 1 })
  version: number;

  @Column({ type: 'jsonb', name: 'metadata', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

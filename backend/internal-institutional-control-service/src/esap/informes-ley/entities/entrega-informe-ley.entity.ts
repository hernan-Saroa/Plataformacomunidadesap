import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { InformeLey } from './informe-ley.entity';

@Entity('entrega_informe_ley', { schema: 'control_interno' })
@Index(['informeId'])
@Index(['periodo'])
@Index(['estado'])
@Index(['fechaVencimiento'])
export class EntregaInformeLey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'informe_id', nullable: false })
  informeId: string;

  @ManyToOne(() => InformeLey, (informe) => informe.entregas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'informe_id' })
  informeLey: InformeLey;

  @Column({ type: 'varchar', length: 50, nullable: false })
  periodo: string; // "2025-01", "2025-Q1", "2025-S1", "2025"

  @Column({ type: 'date', name: 'fecha_vencimiento', nullable: false })
  fechaVencimiento: Date;

  @Column({ type: 'timestamp', name: 'fecha_entrega', nullable: true })
  fechaEntrega?: Date;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'pendiente',
  })
  estado: 'pendiente' | 'en-proceso' | 'entregado' | 'vencido' | 'rechazado';

  // Archivo
  @Column({ type: 'varchar', length: 255, name: 'archivo_nombre', nullable: true })
  archivoNombre?: string;

  @Column({ type: 'varchar', length: 500, name: 'archivo_url', nullable: true })
  archivoUrl?: string;

  @Column({ type: 'bigint', name: 'archivo_tamano', nullable: true })
  archivoTamano?: number;

  // Proceso
  @Column({ type: 'varchar', length: 255, name: 'elaborado_por', nullable: true })
  elaboradoPor?: string;

  @Column({ type: 'timestamp', name: 'fecha_elaboracion', nullable: true })
  fechaElaboracion?: Date;

  @Column({ type: 'varchar', length: 255, name: 'aprobado_por', nullable: true })
  aprobadoPor?: string;

  @Column({ type: 'timestamp', name: 'fecha_aprobacion', nullable: true })
  fechaAprobacion?: Date;

  @Column({ type: 'varchar', length: 255, name: 'enviado_por', nullable: true })
  enviadoPor?: string;

  // Radicado
  @Column({ type: 'varchar', length: 255, name: 'numero_radicado', nullable: true })
  numeroRadicado?: string;

  @Column({ type: 'timestamp', name: 'fecha_radicacion', nullable: true })
  fechaRadicacion?: Date;

  // Observaciones
  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({ type: 'text', name: 'motivo_rechazo', nullable: true })
  motivoRechazo?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


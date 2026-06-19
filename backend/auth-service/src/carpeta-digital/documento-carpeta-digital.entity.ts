import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CarpetaDigital } from './carpeta-digital.entity';
import { TipoDocumento } from './tipo-documento.entity';

@Entity('documento_carpeta_digital')
@Index(['carpetaDigitalId'])
@Index(['tipoDocumentoId'])
@Index(['estado'])
export class DocumentoCarpetaDigital {
  @PrimaryGeneratedColumn('uuid', { name: 'id_documento' })
  id: string;

  @Column({ name: 'carpeta_digital_id', type: 'uuid' })
  carpetaDigitalId: string;

  @ManyToOne(() => CarpetaDigital, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carpeta_digital_id' })
  carpetaDigital: CarpetaDigital;

  @Column({ name: 'tipo_documento_id', type: 'uuid', nullable: true })
  tipoDocumentoId: string | null;

  @ManyToOne(() => TipoDocumento, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tipo_documento_id' })
  tipoDocumento: TipoDocumento | null;

  /** Enlace lógico (no FK) a academic_work_plan.RundSoporteCampo.id */
  @Column({ name: 'rund_soporte_id', type: 'uuid', nullable: true })
  rundSoporteId: string | null;

  @Column({ name: 'nombre', type: 'varchar', length: 255 })
  nombre: string;

  @Column({ name: 'categoria', type: 'varchar', length: 80, default: 'otros' })
  categoria: string;

  @Column({ name: 'tipo_archivo', type: 'varchar', length: 40, nullable: true })
  tipoArchivo: string | null;

  @Column({ name: 'tamano_bytes', type: 'bigint', default: 0 })
  tamanoBytes: number;

  @Column({ name: 'url_archivo', type: 'text' })
  urlArchivo: string;

  @Column({ name: 'estado', type: 'varchar', length: 30, default: 'pendiente' })
  estado: 'pendiente' | 'validado' | 'rechazado' | 'vencido';

  @Column({ name: 'comentarios', type: 'text', nullable: true })
  comentarios: string | null;

  @Column({ name: 'validado_por', type: 'uuid', nullable: true })
  validadoPor: string | null;

  @Column({ name: 'fecha_validacion', type: 'timestamp', nullable: true })
  fechaValidacion: Date | null;

  @Column({ name: 'fecha_subida', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaSubida: Date;

  @Column({ name: 'fecha_vencimiento', type: 'timestamp', nullable: true })
  fechaVencimiento: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

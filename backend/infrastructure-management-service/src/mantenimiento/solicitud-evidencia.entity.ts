import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { SolicitudMantenimiento } from './mantenimiento.entity';

@Entity({ name: 'solicitud_evidencia', schema: 'infrastructure-management' })
@Unique('uq_solicitud_evidencia_ruta_objeto', ['bucket', 'rutaObjeto'])
@Index('idx_solicitud_evidencia_solicitud', ['idSolicitud', 'orden'])
@Index('idx_solicitud_evidencia_vencimiento', ['vencimientoPresigned'])
export class SolicitudEvidencia {
  @PrimaryGeneratedColumn('uuid', { name: 'id_evidencia' })
  idEvidencia: string;

  @Column({ type: 'uuid', name: 'id_solicitud', nullable: true })
  idSolicitud?: string;

  @ManyToOne(() => SolicitudMantenimiento, (s) => s.evidencias, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'id_solicitud', referencedColumnName: 'idSolicitud' })
  solicitud?: SolicitudMantenimiento;

  @Column({ type: 'varchar', length: 255, name: 'nombre_original' })
  nombreOriginal: string;

  @Column({ type: 'varchar', length: 255, name: 'nombre_almacenado' })
  nombreAlmacenado: string;

  @Column({ type: 'varchar', length: 512, name: 'ruta_objeto' })
  rutaObjeto: string;

  @Column({ type: 'varchar', length: 80, default: 'infraestructura-evidencias' })
  bucket: string;

  @Column({ type: 'text', name: 'url_publica', nullable: true })
  urlPublica?: string;

  @Column({ type: 'text', name: 'url_presigned', nullable: true })
  urlPresigned?: string;

  @Column({ type: 'timestamptz', name: 'vencimiento_presigned', nullable: true })
  vencimientoPresigned?: Date;

  @Column({ type: 'varchar', length: 120, name: 'mime_type', nullable: true })
  mimeType?: string;

  @Column({ type: 'bigint', name: 'tamano_bytes' })
  tamanoBytes: number;

  @Column({ type: 'uuid', name: 'usuario_que_subio_id', nullable: true })
  usuarioQueSubioId?: string;

  @Column({ type: 'varchar', length: 180, name: 'usuario_que_subio_email', nullable: true })
  usuarioQueSubioEmail?: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  @Column({ type: 'timestamptz', name: 'fecha_subida', default: () => 'NOW()' })
  fechaSubida: Date;
}

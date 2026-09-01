import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SolicitudComisionEntity } from './solicitud-comision.entity';

@Entity({ schema: 'travel_expenses', name: 'documentos_soporte' })
@Index('idx_documentos_soporte_solicitud', ['solicitudId'])
export class DocumentoSoporteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitud_id', type: 'uuid' })
  solicitudId: string;

  @ManyToOne(() => SolicitudComisionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud: SolicitudComisionEntity;

  @Column({ name: 'tipo_documento', type: 'varchar', length: 50 })
  tipoDocumento: string;

  @Column({ name: 'nombre_archivo_original', type: 'varchar', length: 255 })
  nombreArchivoOriginal: string;

  @Column({ name: 'nombre_archivo_seguro', type: 'varchar', length: 255 })
  nombreArchivoSeguro: string;

  @Column({ name: 'url_repositorio', type: 'varchar', length: 512 })
  urlRepositorio: string;

  @Column({
    name: 'tipo_mime',
    type: 'varchar',
    length: 100,
    default: 'application/pdf',
  })
  tipoMime: string;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}

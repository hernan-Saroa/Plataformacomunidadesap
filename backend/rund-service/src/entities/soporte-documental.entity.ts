import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocenteEntity } from './docente.entity';

@Entity({ name: 'soporte_documental', schema: 'rund' })
export class SoporteDocumentalEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id_soporte' })
  idSoporte: string;

  @Column({ type: 'uuid', name: 'id_docente' })
  idDocente: string;

  @ManyToOne(() => DocenteEntity, (d) => d.soportes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_docente' })
  docente: DocenteEntity;

  @Column({ type: 'varchar', length: 80, name: 'tipo_documento' })
  tipoDocumento: string; // DOCUMENTO_IDENTIDAD, TITULO_PREGRADO, TITULO_POSGRADO, CERTIFICADO_LABORAL, RUT, ANTECEDENTES, CVLAC, CERTIFICADO_MINCIENCIAS

  @Column({ type: 'varchar', length: 50, name: 'categoria', default: 'GENERAL' })
  categoria: string; // IDENTIFICACION, ACADEMICO, LABORAL, INVESTIGACION, NOVEDADES

  @Column({ type: 'varchar', length: 255, name: 'nombre_archivo' })
  nombreArchivo: string;

  @Column({ type: 'text', name: 'ruta_archivo' })
  rutaArchivo: string;

  @Column({ type: 'varchar', length: 100, name: 'mimetype', default: 'application/pdf' })
  mimetype: string;

  @Column({ type: 'bigint', name: 'tamano_bytes', nullable: true })
  tamanoBytes?: number;

  @Column({ type: 'varchar', length: 64, name: 'hash_sha256', nullable: true })
  hashSha256?: string;

  @Column({ type: 'varchar', length: 30, name: 'estado_validacion', default: 'PENDIENTE' })
  estadoValidacion: string; // PENDIENTE, APROBADO, RECHAZADO, OBSERVADO

  @Column({ type: 'uuid', name: 'validado_por', nullable: true })
  validadoPor?: string;

  @Column({ type: 'timestamptz', name: 'fecha_validacion', nullable: true })
  fechaValidacion?: Date;

  @Column({ type: 'text', name: 'observaciones', nullable: true })
  observaciones?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

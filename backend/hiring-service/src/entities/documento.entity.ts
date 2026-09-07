import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TipoDocumento = 'ADJUNTO' | 'SNAPSHOT_FORMULARIO';

@Entity('documentos', { schema: 'hiring' })
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'expediente_id', type: 'uuid' })
  expedienteId: string;

  @Column({ length: 20, nullable: true })
  numeral: string;

  /**
   * ADJUNTO: archivo en disco (archivo_url).
   * SNAPSHOT_FORMULARIO: copia inmutable del formulario al enviarlo, que es
   * lo que hace que el estudio previo quede "registrado como documento"
   * en el expediente (criterio 1 del HU).
   */
  @Column({ length: 30, default: 'ADJUNTO' })
  tipo: TipoDocumento;

  @Column({ length: 300 })
  nombre: string;

  @Column({ name: 'archivo_url', type: 'text', nullable: true })
  archivoUrl: string;

  @Column({ name: 'contenido_snapshot', type: 'jsonb', nullable: true })
  contenidoSnapshot: Record<string, any>;

  @Column({ name: 'archivo_nombre_original', length: 300, nullable: true })
  archivoNombreOriginal: string;

  @Column({ name: 'archivo_mime_type', length: 120, nullable: true })
  archivoMimeType: string;

  @Column({ name: 'archivo_tamano', type: 'bigint', nullable: true })
  archivoTamano: number;

  /** Integridad probatoria: el expediente es prueba ante entes de control. */
  @Column({ name: 'hash_sha256', type: 'char', length: 64 })
  hashSha256: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'subido_por', length: 120, nullable: true })
  subidoPor: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

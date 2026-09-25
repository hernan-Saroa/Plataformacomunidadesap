import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LegalizacionComisionEntity } from './legalizacion-comision.entity';

/**
 * EFDS-1309 — PDF de soporte de una legalización.
 *
 * `ruta_relativa` es relativa a la raíz de almacenamiento del servicio y termina
 * en un UUID: nunca se devuelve al cliente. El archivo se sirve solo por el
 * endpoint autenticado de descarga.
 *
 * Tabla física: travel_expenses.legalizacion_soportes (migración 450).
 */
@Entity({ schema: 'travel_expenses', name: 'legalizacion_soportes' })
export class LegalizacionSoporteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'legalizacion_id', type: 'uuid' })
  legalizacionId: string;

  @ManyToOne(() => LegalizacionComisionEntity, (l) => l.soportes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'legalizacion_id' })
  legalizacion: LegalizacionComisionEntity;

  @Column({ name: 'tipo_documento_soporte_id', type: 'uuid' })
  tipoDocumentoSoporteId: string;

  @Column({ name: 'nombre_archivo_original', type: 'varchar', length: 255 })
  nombreArchivoOriginal: string;

  @Column({ name: 'ruta_relativa', type: 'varchar', length: 512 })
  rutaRelativa: string;

  @Column({ name: 'tamano_bytes', type: 'int' })
  tamanoBytes: number;

  @Column({ name: 'sha256', type: 'char', length: 64 })
  sha256: string;

  @Column({ name: 'cargado_por_id', type: 'uuid' })
  cargadoPorId: string;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn: Date;
}

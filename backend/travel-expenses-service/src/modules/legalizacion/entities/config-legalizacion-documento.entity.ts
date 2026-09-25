import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TipoDocumentoSoporteEntity } from '../../../entities/config/tipo-documento-soporte.entity';

export const CONDICIONES_SOPORTE = ['TRANSPORTE_AEREO'] as const;
export type CondicionSoporte = (typeof CONDICIONES_SOPORTE)[number];

/**
 * EFDS-1309 — Soporte exigido para legalizar, por tipo de comisionado.
 *
 * Misma forma que config_tipo_comisionado_documentos (EFDS-1258) y sobre el
 * mismo catálogo tipos_documento_soporte, pero para la fase de legalización.
 * `condicion` NULL = aplica siempre.
 *
 * Tabla física: travel_expenses.config_legalizacion_documentos (migración 450).
 */
@Entity({ schema: 'travel_expenses', name: 'config_legalizacion_documentos' })
export class ConfigLegalizacionDocumentoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'config_tipo_comisionado_id', type: 'uuid' })
  configTipoComisionadoId: string;

  @Column({ name: 'tipo_documento_soporte_id', type: 'uuid' })
  tipoDocumentoSoporteId: string;

  @ManyToOne(() => TipoDocumentoSoporteEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tipo_documento_soporte_id' })
  tipoDocumentoSoporte: TipoDocumentoSoporteEntity;

  @Column({ name: 'tipo_requisito', type: 'varchar', length: 20 })
  tipoRequisito: 'OBLIGATORIO' | 'OPCIONAL';

  @Column({ name: 'condicion', type: 'varchar', length: 40, nullable: true })
  condicion: CondicionSoporte | null;

  @Column({ name: 'orden', type: 'int', default: 0 })
  orden: number;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn: Date;

  @Column({ name: 'actualizado_en', type: 'timestamptz', default: () => 'now()' })
  actualizadoEn: Date;
}

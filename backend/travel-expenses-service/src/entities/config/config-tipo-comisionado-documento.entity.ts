import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ConfigTipoComisionadoEntity } from './config-tipo-comisionado.entity';
import { TipoDocumentoSoporteEntity } from './tipo-documento-soporte.entity';

@Entity({ schema: 'travel_expenses', name: 'config_tipo_comisionado_documentos' })
@Index('idx_config_tipo_comisionado_documentos_unique', ['configTipoComisionadoId', 'tipoDocumentoSoporteId'], { unique: true })
export class ConfigTipoComisionadoDocumentoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'config_tipo_comisionado_id', type: 'uuid' })
  configTipoComisionadoId: string;

  @ManyToOne(() => ConfigTipoComisionadoEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'config_tipo_comisionado_id' })
  configTipoComisionado: ConfigTipoComisionadoEntity;

  @Column({ name: 'tipo_documento_soporte_id', type: 'uuid' })
  tipoDocumentoSoporteId: string;

  @ManyToOne(() => TipoDocumentoSoporteEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tipo_documento_soporte_id' })
  tipoDocumentoSoporte: TipoDocumentoSoporteEntity;

  @Column({ name: 'tipo_requisito', type: 'varchar', length: 20 })
  tipoRequisito: 'OBLIGATORIO' | 'OPCIONAL';

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}

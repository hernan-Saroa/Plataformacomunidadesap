import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ConfigTipoComisionadoDocumentoEntity } from './config-tipo-comisionado-documento.entity';

@Entity({ schema: 'travel_expenses', name: 'config_tipo_comisionado' })
@Index('idx_config_tipo_comisionado_tipo', ['tipoComisionado'], {
  unique: true,
})
@Index('idx_config_tipo_comisionado_codigo_formulario', ['codigoFormulario'])
export class ConfigTipoComisionadoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'tipo_comisionado',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  tipoComisionado: string;

  @Column({ name: 'codigo_formulario', type: 'varchar', length: 50 })
  codigoFormulario: string;

  @Column({ name: 'campos_obligatorios', type: 'jsonb', default: [] })
  camposObligatorios: string[];

  @Column({ name: 'campos_opcionales', type: 'jsonb', default: [] })
  camposOpcionales: string[];

  @Column({ name: 'campos_ocultos', type: 'jsonb', default: [] })
  camposOcultos: string[];

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @OneToMany(
    () => ConfigTipoComisionadoDocumentoEntity,
    (rel) => rel.configTipoComisionado,
    { cascade: true },
  )
  documentos: ConfigTipoComisionadoDocumentoEntity[];
}

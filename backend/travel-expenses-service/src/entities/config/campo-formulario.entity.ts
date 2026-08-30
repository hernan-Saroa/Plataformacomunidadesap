import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TipoCampoFormulario {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  SELECT = 'SELECT',
  DATE = 'DATE',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  CURRENCY = 'CURRENCY',
  DOCUMENT = 'DOCUMENT',
}

export enum GrupoCampoFormulario {
  COMISIONADO = 'comisionado',
  COMISION = 'comision',
  VALORES = 'valores',
  SOPORTES = 'soportes',
}

@Entity({ schema: 'travel_expenses', name: 'config_campos_formulario' })
@Index('idx_config_campos_clave', ['clave'], { unique: true })
@Index('idx_config_campos_grupo_orden', ['grupo', 'orden'])
export class CampoFormularioEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clave', type: 'varchar', length: 100, unique: true })
  clave: string;

  @Column({ name: 'etiqueta', type: 'varchar', length: 200 })
  etiqueta: string;

  @Column({ name: 'tipo_campo', type: 'varchar', length: 50 })
  tipoCampo: TipoCampoFormulario;

  @Column({ name: 'placeholder', type: 'varchar', length: 200, nullable: true })
  placeholder: string | null;

  @Column({ name: 'opciones', type: 'jsonb', nullable: true })
  opciones: Array<{ value: string; label: string }> | null;

  @Column({ name: 'grupo', type: 'varchar', length: 50, nullable: true })
  grupo: GrupoCampoFormulario | null;

  @Column({ name: 'orden', type: 'int', default: 0 })
  orden: number;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Signer } from './signer.entity';
import { TemplateConfigChange } from './template-config-change.entity';

@Entity({
  schema: 'academic_registration',
  name: 'certificate_template_config',
})
export class TemplateConfig {
  @PrimaryGeneratedColumn()
  id: number;

  // Relación con firmante
  @Column({ name: 'signer_id', type: 'uuid', nullable: true })
  signerId: string;

  // Logo institucional
  @Column({ name: 'institution_logo_url', type: 'text', nullable: true })
  institutionLogoUrl: string;

  @Column({ name: 'institution_logo_filename', length: 255, nullable: true })
  institutionLogoFilename: string;

  // Tipografía
  @Column({
    name: 'typography_font',
    length: 100,
    default: 'Arial Narrow, Arial, sans-serif',
  })
  typographyFont: string;

  // Título del cargo del firmante
  @Column({ name: 'signer_title_override', length: 255, nullable: true })
  signerTitleOverride: string;

  // Contenido HTML del certificado
  @Column({ name: 'certificate_content_html', type: 'text' })
  certificateContentHtml: string;

  // Versión y estado
  @Column({ length: 50, default: '1.0.0' })
  version: string;

  @Column({ length: 50, default: 'draft' })
  status: string; // draft, published

  // Firma (puede sobrescribir la del firmante)
  @Column({ name: 'signature_url_override', type: 'text', nullable: true })
  signatureUrlOverride: string | null;

  @Column({
    name: 'signature_filename_override',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  signatureFilenameOverride: string | null;

  @Column({
    name: 'signer_name_override',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  signerNameOverride: string | null;

  // Auditoría
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', length: 255, nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', length: 255, nullable: true })
  updatedBy: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  // Relaciones
  @ManyToOne(() => Signer)
  @JoinColumn({ name: 'signer_id' })
  signer: Signer;

  @OneToMany(() => TemplateConfigChange, (change) => change.templateConfig)
  changes: TemplateConfigChange[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { Firmante } from './firmante.entity';

@Entity('certificate_template_config')
export class TemplateConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'firmante_id', type: 'uuid', nullable: true })
  firmanteId: string;

  @ManyToOne(() => Firmante, { eager: true })
  @JoinColumn({ name: 'firmante_id' })
  firmante: Firmante;

  @Column({ name: 'entity_logo_url', type: 'text', nullable: true })
  entityLogoUrl: string;

  @Column({ name: 'entity_logo_filename', nullable: true })
  entityLogoFilename: string;

  @Column({ name: 'entity_logo_size', nullable: true })
  entityLogoSize: string;

  @Column({ name: 'typography_font', default: 'Times New Roman', nullable: true })
  typographyFont: string;

  @Column({ name: 'cargo_title', type: 'text', nullable: true })
  cargoTitle: string;

  @Column({ name: 'certificate_content_html', type: 'text', nullable: true })
  certificateContentHtml: string;

  @Column({ default: '1.0.0' })
  version: string;

  @Column({ default: 'draft' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'template_type', default: 'docente' })
  templateType: string;

  @Column({ name: 'signature_url', type: 'text', nullable: true })
  signatureUrl: string | null;

  @Column({ name: 'signature_filename', type: 'text', nullable: true })
  signatureFilename: string | null;

  @Column({ name: 'signature_size', type: 'text', nullable: true })
  signatureSize: string | null;

  @Column({ name: 'signer_name_override', type: 'text', nullable: true })
  signerNameOverride: string | null;
}

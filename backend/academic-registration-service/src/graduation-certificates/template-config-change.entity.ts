import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TemplateConfig } from './template-config.entity';

@Entity({ schema: 'academic_registration', name: 'template_config_changes' })
export class TemplateConfigChange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relación con plantilla
  @Column({ name: 'template_config_id', type: 'integer' })
  templateConfigId: number;

  // Tipo de cambio
  @Column({ name: 'change_type', length: 50 })
  changeType: string; // CREATED, UPDATED, PUBLISHED, REVERTED

  // Descripción del cambio
  @Column({ name: 'field_changed', length: 100, nullable: true })
  fieldChanged: string;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue: string;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue: string;

  // Actor
  @Column({ name: 'changed_by', length: 255 })
  changedBy: string;

  @CreateDateColumn({ name: 'change_date' })
  changeDate: Date;

  // Observaciones
  @Column({ type: 'text', nullable: true })
  observations: string;

  // Relaciones
  @ManyToOne(() => TemplateConfig, (config) => config.changes)
  @JoinColumn({ name: 'template_config_id' })
  templateConfig: TemplateConfig;
}

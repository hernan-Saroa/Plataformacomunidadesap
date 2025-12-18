import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { TemplateConfig } from './template-config.entity';

@Entity('template_config_changes')
export class TemplateConfigChange {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_config_id' })
  templateConfigId: number;

  @ManyToOne(() => TemplateConfig)
  @JoinColumn({ name: 'template_config_id' })
  templateConfig: TemplateConfig;

  @Column({ name: 'change_type', length: 50 })
  changeType: string; // 'logo', 'firma', 'nombre', 'multiple'

  @Column({ name: 'field_name', length: 100 })
  fieldName: string; // Campo específico que cambió

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue: string;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;

  @Column({ name: 'changed_by', nullable: true })
  changedBy: string;

  @Column({ name: 'user_info', type: 'jsonb', nullable: true })
  userInfo: Record<string, any>;
}

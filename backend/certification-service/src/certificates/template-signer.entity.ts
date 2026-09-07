import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('template_signers')
export class TemplateSigner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  full_name: string;

  @Column({ length: 150 })
  position: string;

  @Column({ length: 255 })
  department: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_primary: boolean;

  @Column({ type: 'text', nullable: true })
  signature_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

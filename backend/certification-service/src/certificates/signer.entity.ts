import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('signers')
export class Signer {
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

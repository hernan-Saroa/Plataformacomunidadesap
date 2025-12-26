import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'academic_registration', name: 'signers' })
export class Signer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Información del firmante
  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ length: 255 })
  position: string;

  @Column({ length: 255, nullable: true })
  department: string;

  @Column({ length: 255, nullable: true })
  email: string;

  // Firma digital
  @Column({ name: 'signature_url', type: 'text', nullable: true })
  signatureUrl: string;

  @Column({ name: 'signature_filename', length: 255, nullable: true })
  signatureFilename: string;

  // Estado
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  // Auditoría
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

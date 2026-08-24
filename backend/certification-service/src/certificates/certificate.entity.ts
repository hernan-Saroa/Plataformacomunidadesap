import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { CertificateRequest } from './certificate-request.entity';
import { CertificateValidation } from './certificate-validation.entity';
import type { TechnicalBonusCategory } from './technical-bonus-assignment.entity';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  verification_code: string;

  @Column({ unique: true, length: 50 })
  certificate_number: string;

  @Column({ type: 'uuid' })
  request_id: string;

  @Column({ length: 255 })
  full_name: string;

  @Column({ length: 50 })
  id_number: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  document_type: string | null;

  @Column({ length: 100 })
  career_category: string;

  @Column({ type: 'date' })
  hiring_date: Date;

  @Column({ length: 100 })
  position_category: string;

  @Column({ length: 150, nullable: true })
  position_location: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monthly_salary: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  technical_bonus: number;

  @Column({ type: 'varchar', length: 80, nullable: true })
  technical_bonus_category: TechnicalBonusCategory | null;

  @Column({ type: 'jsonb', nullable: true })
  technical_bonuses: any[] | null;

  @Column({ type: 'boolean', default: true })
  include_salary: boolean;

  @Column({ type: 'boolean', default: false })
  include_technical_bonus: boolean;

  @Column({ length: 255, nullable: true })
  salary_text: string;

  @Column({ length: 255, nullable: true })
  department: string;

  // The property name is kept as a legacy HTTP/Oracle compatibility alias.
  @Column({ name: 'position_code', length: 255, nullable: true })
  cod_cargo: string;

  // The physical PostgreSQL identifier is standardized in English.
  @Column({ name: 'grade_code', length: 255, nullable: true })
  cod_grade: string;

  // Snapshot of the assignment indicator used by the certificate renderer.
  // It is kept on the certificate so a correction never mutates HR source data.
  @Column({ name: 'assignment_type', type: 'varchar', length: 1, nullable: true })
  encargo_type: 'E' | 'N' | null;

  @Column({ length: 100, nullable: true })
  campus: string;

  @Column({ type: 'date' })
  issue_date: Date;

  @Column({ type: 'timestamp' })
  issuance_timestamp: Date;

  @Column({ length: 255 })
  signer_name: string;

  @Column({ length: 150 })
  signer_position: string;

  @Column({ length: 255 })
  signer_department: string;

  @Column({ length: 255, nullable: true })
  pdf_url: string;

  @Column({ type: 'jsonb', nullable: true })
  template_snapshot: any | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  template_type: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  template_version: string | null;

  @Column({ length: 50, default: 'VALID' })
  status: string;

  @Column({ type: 'boolean', default: false })
  is_corrected: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_corrected_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => CertificateRequest, request => request.certificates)
  @JoinColumn({ name: 'request_id' })
  request: CertificateRequest;

  @OneToMany(() => CertificateValidation, validation => validation.certificate)
  validations: CertificateValidation[];
}

import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Certificate } from './certificate.entity';

@Entity('certificate_requests')
export class CertificateRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  request_number: string;

  @Column({ type: 'uuid', nullable: true })
  person_id: string;

  @Column({ length: 255 })
  full_name: string;

  @Column({ length: 50 })
  id_number: string;

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

  @Column({ length: 255, nullable: true })
  salary_text: string;

  @Column({ length: 255, nullable: true })
  department: string;

  @Column({ length: 100, nullable: true })
  campus: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 50, default: 'PENDING' })
  status: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  validation_code: string | null;

  @Column({ type: 'timestamp', nullable: true })
  validation_expires_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  request_date: Date;

  @Column({ type: 'text', nullable: true })
  observations: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Certificate, certificate => certificate.request)
  certificates: Certificate[];
}

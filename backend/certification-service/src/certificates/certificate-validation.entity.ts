import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Certificate } from './certificate.entity';

@Entity('certificate_validations')
export class CertificateValidation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  certificate_id: string;

  @Column({ type: 'timestamp' })
  validation_date: Date;

  @Column({ length: 50, nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Column({ length: 255, nullable: true })
  location: string;

  @Column({ length: 100, nullable: true })
  country: string;

  @Column({ length: 120, nullable: true })
  region: string;

  @Column({ length: 120, nullable: true })
  city: string;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  @Column({ length: 255, nullable: true })
  isp: string;

  @Column({ length: 50 })
  result: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Certificate, certificate => certificate.validations)
  @JoinColumn({ name: 'certificate_id' })
  certificate: Certificate;
}

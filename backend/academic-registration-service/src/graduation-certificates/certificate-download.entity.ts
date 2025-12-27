import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GraduationCertificate } from './graduation-certificate.entity';

@Entity({ schema: 'academic_registration', name: 'certificate_downloads' })
export class CertificateDownload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'certificate_id', type: 'uuid' })
  certificateId: string;

  @CreateDateColumn({ name: 'download_date' })
  downloadDate: Date;

  @Column({ name: 'ip_address', length: 50, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(
    () => GraduationCertificate,
    (certificate) => certificate.downloads,
  )
  @JoinColumn({ name: 'certificate_id' })
  certificate: GraduationCertificate;
}

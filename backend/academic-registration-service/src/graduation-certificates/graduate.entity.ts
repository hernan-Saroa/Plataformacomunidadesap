import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GraduationCertificate } from './graduation-certificate.entity';
import { GraduationCertificateRequest } from './graduation-certificate-request.entity';

@Entity({ schema: 'academic_registration', name: 'graduates' })
export class Graduate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Información personal
  @Column({ name: 'person_id', type: 'uuid' })
  personId: string;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ name: 'id_number', length: 50, unique: true })
  idNumber: string;

  @Column({ name: 'id_issue_date', type: 'date', nullable: true })
  idIssueDate: Date;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  // Información académica
  @Column({ name: 'program_id', type: 'uuid' })
  programId: string;

  @Column({ name: 'program_name', length: 255 })
  programName: string;

  @Column({ name: 'program_type', length: 50 })
  programType: string; // 'Pregrado', 'Especialización', 'Maestría'

  // Fechas importantes
  @Column({ name: 'enrollment_date', type: 'date', nullable: true })
  enrollmentDate: Date;

  @Column({ name: 'graduation_date', type: 'date' })
  graduationDate: Date;

  @Column({ name: 'ceremony_date', type: 'date', nullable: true })
  ceremonyDate: Date;

  // Información del título
  @Column({ name: 'degree_title', length: 255 })
  degreeTitle: string;

  @Column({ name: 'diploma_number', length: 100, unique: true, nullable: true })
  diplomaNumber: string;

  @Column({ name: 'acta_number', length: 100, nullable: true })
  actaNumber: string;

  @Column({ name: 'resolution_number', length: 100, nullable: true })
  resolutionNumber: string;

  // Estado y validación
  @Column({ length: 50, default: 'ACTIVE' })
  status: string; // ACTIVE, REVOKED, SUSPENDED

  @Column({ name: 'is_verified', type: 'boolean', default: true })
  isVerified: boolean;

  // Ubicación
  @Column({ length: 100, nullable: true })
  campus: string;

  // Auditoría
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', length: 255, nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', length: 255, nullable: true })
  updatedBy: string;

  // Relaciones
  @OneToMany(() => GraduationCertificateRequest, (request) => request.graduate)
  certificateRequests: GraduationCertificateRequest[];

  @OneToMany(() => GraduationCertificate, (certificate) => certificate.graduate)
  certificates: GraduationCertificate[];
}

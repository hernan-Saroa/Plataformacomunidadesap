import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Certificado } from './certificado.entity';

@Entity('solicitudes_certificado')
export class SolicitudCertificado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  numero_solicitud: string;

  @Column({ type: 'uuid', nullable: true })
  person_id: string;

  @Column({ length: 255 })
  nombre_completo: string;

  @Column({ length: 50 })
  cedula: string;

  @Column({ length: 100 })
  carrera_categoria: string;

  @Column({ type: 'date' })
  fecha_vinculacion: Date;

  @Column({ length: 100 })
  categoria_cargo: string;

  @Column({ length: 150, nullable: true })
  ubicacion_cargo: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salario_mensual: number;

  @Column({ length: 255, nullable: true })
  salario_texto: string;

  @Column({ length: 255, nullable: true })
  dependencia: string;

  @Column({ length: 100, nullable: true })
  sede: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  telefono: string;

  @Column({ length: 50, default: 'PENDIENTE' })
  estado: string;

  @Column({ type: 'timestamp', nullable: true })
  fecha_solicitud: Date;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Certificado, certificado => certificado.solicitud)
  certificados: Certificado[];
}

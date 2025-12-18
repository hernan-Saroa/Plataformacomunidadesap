import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { SolicitudCertificado } from './solicitud-certificado.entity';
import { ValidacionCertificado } from './validacion-certificado.entity';

@Entity('certificados')
export class Certificado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  codigo_verificacion: string;

  @Column({ unique: true, length: 50 })
  numero_certificado: string;

  @Column({ type: 'uuid' })
  solicitud_id: string;

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

  @Column({ type: 'date' })
  fecha_emision: Date;

  @Column({ type: 'timestamp' })
  fecha_expedicion: Date;

  @Column({ length: 255 })
  firmante_nombre: string;

  @Column({ length: 150 })
  firmante_cargo: string;

  @Column({ length: 255 })
  firmante_dependencia: string;

  @Column({ length: 255, nullable: true })
  pdf_url: string;

  @Column({ length: 50, default: 'VIGENTE' })
  estado: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => SolicitudCertificado, solicitud => solicitud.certificados)
  @JoinColumn({ name: 'solicitud_id' })
  solicitud: SolicitudCertificado;

  @OneToMany(() => ValidacionCertificado, validacion => validacion.certificado)
  validaciones: ValidacionCertificado[];
}

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ schema: 'travel_expenses', name: 'comisionados' })
@Index('idx_comisionados_numero_documento', ['numero_documento'], { unique: true })
export class ComisionadoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'numero_documento', type: 'varchar', length: 20, unique: true })
  @Index('idx_comisionados_numero_documento')
  numeroDocumento: string;

  @Column({ name: 'primer_nombre', type: 'varchar', length: 100 })
  primerNombre: string;

  @Column({ name: 'segundo_nombre', type: 'varchar', length: 100, nullable: true })
  segundoNombre: string;

  @Column({ name: 'primer_apellido', type: 'varchar', length: 100 })
  primerApellido: string;

  @Column({ name: 'segundo_apellido', type: 'varchar', length: 100, nullable: true })
  segundoApellido: string;

  @Column({ type: 'varchar', length: 150 })
  email: string;

  @Column({ name: 'telefono_contacto', type: 'varchar', length: 150 })
  telefonoContacto: string;

  @Column({ name: 'tipo_comisionado', type: 'varchar', length: 50 })
  tipoComisionado: string;

  @Column({ name: 'origen_datos', type: 'varchar', length: 50 })
  origenDatos: string;

  @Column({ name: 'autorizacion_habeas_data', type: 'boolean', default: false })
  autorizacionHabeasData: boolean;

  @Column({ name: 'fecha_autorizacion_habeas_data', type: 'timestamp', nullable: true })
  fechaAutorizacionHabeasData: Date | null;

  @Column({ name: 'ip_registro_habeas_data', type: 'varchar', length: 45, nullable: true })
  ipRegistroHabeasData: string | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}

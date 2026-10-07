import { Column, Entity, OneToOne, ManyToOne, JoinColumn, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Seccional } from './seccional.entity';
import { Sede } from './sede.entity';
import { Dependencia } from './dependencia.entity';
import { Cargo } from './cargo.entity';


@Entity('personas')
export class Person {
  @PrimaryColumn('uuid', { name: 'id_person' })
  id: string;

  @Column({ name: 'id_tercero', type: 'bigint', nullable: true, select: false })
  idTercero: string | null;

  @Column({ name: 'num_identificacion' })
  identification_number: string;

  @Column({ name: 'tip_identificacion' })
  identification_type: string;

  @Column({ name: 'nom_largo' })
  full_name: string;

  @Column({ name: 'nom_tercero' })
  first_name: string;

  @Column({ name: 'pri_apellido' })
  last_name: string;

  @Column({ name: 'gen_tercero' })
  gender: string;

  @Column({ name: 'dir_email' })
  email: string;

  @Column({ name: 'tel_celular', nullable: true })
  phone: string;


  @CreateDateColumn({ name: 'fec_creacion' })
  created_at: Date;

  @UpdateDateColumn({ name: 'fec_modificacion' })
  updated_at: Date;

  @OneToOne(() => User, user => user.person)
  user: User;

  // Relación con Seccional (Territorial)
  @Column({ name: 'id_seccional', type: 'bigint', nullable: true })
  idSeccional: number | null;

  @ManyToOne(() => Seccional, { nullable: true })
  @JoinColumn({ name: 'id_seccional' })
  seccional: Seccional | null;

  // Relación con Sede (CETAP)
  @Column({ name: 'id_sede', type: 'bigint', nullable: true })
  idSede: number | null;

  @ManyToOne(() => Sede, { nullable: true })
  @JoinColumn({ name: 'id_sede' })
  sede: Sede | null;

  // Relación con Dependencia (catálogo transversal auth.dependencias).
  // Consumido por el módulo de viáticos (cupo presupuestal de tiquetes por
  // dependencia) y otros microservicios.
  @Column({ name: 'id_dependencia', type: 'bigint', nullable: true })
  idDependencia: number | null;

  @ManyToOne(() => Dependencia, { nullable: true })
  @JoinColumn({ name: 'id_dependencia' })
  dependencia: Dependencia | null;

  // Relación con Cargo (catálogo transversal auth.cargos).
  @Column({ name: 'id_cargo', type: 'bigint', nullable: true })
  idCargo: number | null;

  @ManyToOne(() => Cargo, { nullable: true })
  @JoinColumn({ name: 'id_cargo' })
  cargo: Cargo | null;

  @Column({ name: 'fec_nacimiento', type: 'date', nullable: true })
  fec_nacimiento: string | null;

  @Column({ name: 'dir_residencia', type: 'varchar', nullable: true })
  dir_residencia: string | null;

  @Column({ name: 'city', type: 'varchar', nullable: true })
  city: string | null;
}

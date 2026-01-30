import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Geopolitica } from './geopolitica.entity';
import { Seccional } from './seccional.entity';

@Entity({ name: 'sedes', schema: 'auth' })
export class Sede {
  @PrimaryColumn({ name: 'id_sede', type: 'bigint' })
  idSede: number;

  @Column({ name: 'id_empresa', type: 'bigint', nullable: true, default: 1 })
  idEmpresa: number;

  @Column({ name: 'cod_sede', length: 5, nullable: true })
  codSede: string;

  @Column({ name: 'nom_sede', length: 50 })
  nomSede: string;

  @Column({ name: 'id_geopolitica', type: 'bigint', nullable: true })
  idGeopolitica: number;

  @ManyToOne(() => Geopolitica)
  @JoinColumn({ name: 'id_geopolitica' })
  geopolitica: Geopolitica;

  @Column({ name: 'dir_sede', length: 250, nullable: true })
  dirSede: string;

  @Column({ name: 'fec_ult_act', type: 'date', nullable: true })
  fecUltAct: Date;

  @Column({ name: 'fec_creacion', type: 'date', nullable: true })
  fecCreacion: Date;

  @Column({ name: 'usu_creacion', length: 20, nullable: true })
  usuCreacion: string;

  @Column({ name: 'usu_actualizacion', length: 20, nullable: true })
  usuActualizacion: string;

  @Column({ name: 'cod_atributo', length: 10, nullable: true })
  codAtributo: string;

  @Column({ name: 'id_seccional', type: 'bigint', nullable: true })
  idSeccional: number;

  @ManyToOne(() => Seccional, { nullable: true })
  @JoinColumn({ name: 'id_seccional' })
  seccional: Seccional;

  @Column({ name: 'sede_act', length: 30, nullable: true })
  sedeAct: string;

  @Column({ name: 'num_latitud', type: 'numeric', precision: 32, scale: 29, nullable: true })
  numLatitud: number;

  @Column({ name: 'num_longitud', type: 'numeric', precision: 32, scale: 29, nullable: true })
  numLongitud: number;

  // @Column({ name: 'cod_iac_inscripciones', length: 250, nullable: true })
  // codIacInscripciones: string;

  // @Column({ name: 'cod_iac_matricula', length: 250, nullable: true })
  // codIacMatricula: string;

  // @Column({ name: 'cod_iac_otros_conceptos', length: 250, nullable: true })
  // codIacOtrosConceptos: string;

  // Campos adicionales para información de contacto y capacidades
  @Column({ name: 'tel_sede', length: 50, nullable: true })
  telSede: string;

  @Column({ name: 'email_sede', length: 100, nullable: true })
  emailSede: string;

  @Column({ name: 'capacidad_estudiantes', type: 'int', nullable: true })
  capacidadEstudiantes: number;

  @Column({ name: 'capacidad_docentes', type: 'int', nullable: true })
  capacidadDocentes: number;

  @Column({ name: 'permite_inscripciones', type: 'boolean', nullable: true, default: true })
  permiteInscripciones: boolean;

  @Column({ name: 'permite_matriculas', type: 'boolean', nullable: true, default: true })
  permiteMatriculas: boolean;

  @Column({ name: 'visible_portal', type: 'boolean', nullable: true, default: true })
  visiblePortal: boolean;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones: string;
}

import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Geopolitica } from './geopolitica.entity';

@Entity({ name: 'seccionales', schema: 'auth' })
export class Seccional {
  @PrimaryColumn({ name: 'id_seccional', type: 'bigint' })
  idSeccional: number;

  @Column({ name: 'nom_seccional', length: 100 })
  nomSeccional: string;

  @Column({ name: 'dir_seccional', length: 250, nullable: true })
  dirSeccional: string;

  @Column({ name: 'id_ubi_seccional', type: 'bigint', nullable: true })
  idUbiSeccional: number;

  @ManyToOne(() => Geopolitica, { nullable: true })
  @JoinColumn({ name: 'id_ubi_seccional' })
  ubicacion: Geopolitica;

  @Column({ name: 'fec_creacion', type: 'date', nullable: true })
  fecCreacion: Date;

  @Column({ name: 'fec_ult_act', type: 'date', nullable: true })
  fecUltAct: Date;

  @Column({ name: 'usu_creacion', length: 20, nullable: true })
  usuCreacion: string;

  @Column({ name: 'usu_actualizacion', length: 20, nullable: true })
  usuActualizacion: string;

  @Column({ name: 'cod_seccional', length: 20, nullable: true })
  codSeccional: string;

  @Column({ name: 'id_empresa', type: 'bigint', nullable: true })
  idEmpresa: number;

  @Column({ name: 'nit_seccional', length: 15, nullable: true })
  nitSeccional: string;
}

import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity({ name: 'geopolitica', schema: 'auth' })
export class Geopolitica {
  @PrimaryColumn({ name: 'id_geopolitica', type: 'bigint' })
  idGeopolitica: number;

  @Column({ name: 'cod_geopolitica', length: 20 })
  codGeopolitica: string;

  @Column({ name: 'cod_pais', type: 'smallint', nullable: true })
  codPais: number;

  @Column({ name: 'cod_departamento', type: 'smallint', nullable: true })
  codDepartamento: number;

  @Column({ name: 'cod_ciudad', type: 'smallint', nullable: true })
  codCiudad: number;

  @Column({ name: 'nom_div_geopolitica', length: 250, nullable: true })
  nomDivGeopolitica: string;

  @Column({ name: 'num_habitantes', type: 'bigint', nullable: true })
  numHabitantes: number;

  @Column({ name: 'tip_division', length: 6, nullable: true })
  tipDivision: string;

  @Column({ name: 'cod_division', length: 6, nullable: true })
  codDivision: string;

  @Column({ name: 'cod_zon_geografica', length: 6, nullable: true })
  codZonGeografica: string;

  @Column({ name: 'fec_ult_act', type: 'date', nullable: true })
  fecUltAct: Date;

  @Column({ name: 'fec_creacion', type: 'date', nullable: true })
  fecCreacion: Date;

  @Column({ name: 'usu_creacion', length: 20, nullable: true })
  usuCreacion: string;

  @Column({ name: 'usu_actualizacion', length: 20, nullable: true })
  usuActualizacion: string;

  @Column({ name: 'cod_lat', type: 'numeric', precision: 11, scale: 8, nullable: true })
  codLat: number;

  @Column({ name: 'cod_lon', type: 'numeric', precision: 11, scale: 8, nullable: true })
  codLon: number;

  @Column({ name: 'id_padre', type: 'bigint', nullable: true })
  idPadre: number;

  @ManyToOne(() => Geopolitica, (geo) => geo.hijos, { nullable: true })
  @JoinColumn({ name: 'id_padre' })
  padre: Geopolitica;

  @OneToMany(() => Geopolitica, (geo) => geo.padre)
  hijos: Geopolitica[];

  @Column({ name: 'ind_oculto', type: 'smallint', default: 0 })
  indOculto: number;
}

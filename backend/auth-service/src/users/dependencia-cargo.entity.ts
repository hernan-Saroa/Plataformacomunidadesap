import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Dependencia } from './dependencia.entity';
import { Cargo } from './cargo.entity';

@Entity({ name: 'dependencias_cargos', schema: 'auth' })
@Unique('uq_dependencias_cargos', ['idDependencia', 'idCargo'])
@Index('idx_dep_cargos_dep', ['idDependencia'])
@Index('idx_dep_cargos_cargo', ['idCargo'])
export class DependenciaCargo {
  @PrimaryGeneratedColumn({ name: 'id_dependencia_cargo', type: 'bigint' })
  idDependenciaCargo: number;

  @Column({ name: 'id_dependencia', type: 'numeric', precision: 11, scale: 0 })
  idDependencia: number;

  @Column({ name: 'id_cargo', type: 'bigint' })
  idCargo: number;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @ManyToOne(() => Dependencia, (d) => d.dependenciasCargos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_dependencia', referencedColumnName: 'idDependencia' })
  dependencia: Dependencia;

  @ManyToOne(() => Cargo, (c) => c.dependenciasCargos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_cargo', referencedColumnName: 'idCargo' })
  cargo: Cargo;
}

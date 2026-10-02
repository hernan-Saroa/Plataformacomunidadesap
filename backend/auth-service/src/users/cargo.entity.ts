import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { DependenciaCargo } from './dependencia-cargo.entity';

@Entity({ name: 'cargos', schema: 'auth' })
@Index('idx_cargos_codigo', ['codCargo'], { unique: true })
@Index('idx_cargos_activo', ['activo'])
export class Cargo {
  @PrimaryColumn({ name: 'id_cargo', type: 'bigint' })
  idCargo: number;

  @Column({ name: 'cod_cargo', type: 'varchar', length: 50, unique: true })
  codCargo: string;

  @Column({ name: 'nom_cargo', type: 'varchar', length: 250 })
  nomCargo: string;

  @Column({ name: 'descripcion', type: 'varchar', length: 500, nullable: true })
  descripcion: string | null;

  @Column({
    name: 'nivel_jerarquico',
    type: 'varchar',
    length: 50,
    default: 'Profesional',
  })
  nivelJerarquico: string;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @OneToMany(() => DependenciaCargo, (dc) => dc.cargo)
  dependenciasCargos: DependenciaCargo[];
}

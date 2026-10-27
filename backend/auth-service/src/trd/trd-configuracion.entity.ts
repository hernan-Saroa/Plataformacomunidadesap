import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TrdSerieSubserie } from './trd-serie-subserie.entity';

@Entity({ name: 'trd_configuraciones', schema: 'auth' })
export class TrdConfiguracion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  version: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 20, default: 'TRD' })
  tipo: 'TRD' | 'TVD';

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: string;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true })
  fechaFin: string | null;

  @Column({ name: 'acto_administrativo', type: 'varchar', length: 255 })
  actoAdministrativo: string;

  @Column({ name: 'convalidacion_estado', type: 'varchar', length: 255 })
  convalidacionEstado: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'es_vigente', type: 'boolean', default: false })
  esVigente: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp without time zone' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamp without time zone' })
  actualizadoEn: Date;

  @OneToMany(() => TrdSerieSubserie, (serie) => serie.trd, {
    cascade: true,
    eager: true,
  })
  series: TrdSerieSubserie[];
}

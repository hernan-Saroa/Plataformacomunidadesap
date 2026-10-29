import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TrdConfiguracion } from './trd-configuracion.entity';

@Entity({ name: 'trd_series_subseries', schema: 'auth' })
export class TrdSerieSubserie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'trd_id', type: 'integer' })
  trdId: number;

  @ManyToOne(() => TrdConfiguracion, (trd) => trd.series, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'trd_id' })
  trd: TrdConfiguracion;

  @Column({ name: 'codigo_dependencia', type: 'varchar', length: 50 })
  codigoDependencia: string;

  @Column({
    name: 'nombre_dependencia',
    type: 'varchar',
    length: 255,
    default: 'OFICINA DE CONTROL INTERNO DISCIPLINARIO',
  })
  nombreDependencia: string;

  @Column({ name: 'codigo_serie', type: 'varchar', length: 50 })
  codigoSerie: string;

  @Column({
    name: 'nombre_serie',
    type: 'varchar',
    length: 255,
    default: 'PROCESOS DISCIPLINARIOS',
  })
  nombreSerie: string;

  @Column({ name: 'codigo_subserie', type: 'varchar', length: 50 })
  codigoSubserie: string;

  @Column({
    name: 'nombre_subserie',
    type: 'varchar',
    length: 255,
    default: 'PROCESOS DISCIPLINARIOS',
  })
  nombreSubserie: string;

  @Column({
    name: 'codigo_identificacion_expediente',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  codigoIdentificacionExpediente: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    default: 'control-disciplinario',
  })
  modulo: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp without time zone' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamp without time zone' })
  actualizadoEn: Date;
}

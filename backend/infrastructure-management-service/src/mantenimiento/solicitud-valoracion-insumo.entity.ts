import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { SolicitudValoracion } from './solicitud-valoracion.entity.js';

@Entity({ name: 'solicitud_valoracion_insumo', schema: 'infrastructure-management' })
@Index('idx_solicitud_valoracion_insumo_valoracion', ['idValoracion'])
export class SolicitudValoracionInsumo {
  @PrimaryGeneratedColumn('uuid', { name: 'id_insumo' })
  idInsumo: string;

  @Column({ type: 'uuid', name: 'id_valoracion' })
  idValoracion: string;

  @ManyToOne(() => SolicitudValoracion, (v) => v.insumos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_valoracion', referencedColumnName: 'idValoracion' })
  valoracion: SolicitudValoracion;

  @Column({ type: 'varchar', length: 50, name: 'codigo_insumo', nullable: true })
  codigoInsumo?: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  cantidad: number;

  @Column({ type: 'varchar', length: 4, name: 'unidad_medida' })
  unidadMedida: 'un' | 'm' | 'm2' | 'kg' | 'L' | 'cj' | 'paq' | 'rol' | 'glb' | 'otro';

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    name: 'costo_unitario_cop',
    default: 0,
  })
  costoUnitarioCop: number;

  @Column({ type: 'varchar', length: 30 })
  disponibilidad: 'DISPONIBLE_EN_BODEGA' | 'NO_DISPONIBLE_A_SOLICITAR';

  @Column({
    type: 'smallint',
    name: 'tiempo_adquisicion_dias',
    nullable: true,
  })
  tiempoAdquisicionDias?: number;

  @Column({ type: 'smallint', name: 'orden_item', default: 1 })
  ordenItem: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

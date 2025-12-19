import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum TipoFestivo {
  NACIONAL = 'nacional',
  REGIONAL = 'regional',
  INSTITUCIONAL = 'institucional',
}

@Entity('dias_festivos', { schema: 'internal_disciplinary_control' })
@Index(['fecha'])
@Index(['tipo'])
@Index(['activo'])
@Unique(['fecha', 'tipo', 'territorio'])
export class DiaFestivo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'varchar', length: 200 })
  descripcion: string;

  @Column({
    type: 'enum',
    enum: TipoFestivo,
  })
  tipo: TipoFestivo;

  @Column({ type: 'varchar', length: 100, nullable: true })
  territorio: string | null; // Solo si tipo = 'regional'

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column('uuid', { name: 'creado_por_id' })
  creadoPorId: string; // FK a personas

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion' })
  fechaActualizacion: Date;
}


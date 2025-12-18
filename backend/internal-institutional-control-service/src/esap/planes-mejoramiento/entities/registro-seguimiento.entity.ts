import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AccionCorrectiva } from './accion-correctiva.entity';
import { SeguimientoTrimestral } from './seguimiento-trimestral.entity';

@Entity('registro_seguimiento', { schema: 'control_interno' })
export class RegistroSeguimiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'accion_id', type: 'uuid' })
  accionId: string;

  @ManyToOne(() => AccionCorrectiva, (accion) => accion.registrosSeguimiento, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accion_id' })
  accion: AccionCorrectiva;

  @Column({ name: 'seguimiento_id', type: 'uuid' })
  seguimientoId: string;

  @ManyToOne(() => SeguimientoTrimestral, (seguimiento) => seguimiento.registros, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seguimiento_id' })
  seguimiento: SeguimientoTrimestral;

  @Column({ name: 'accion_descripcion', type: 'text' })
  accionDescripcion: string;

  @Column({ name: 'acciones_programadas', type: 'int', default: 1 })
  accionesProgramadas: number;

  @Column({ name: 'acciones_implementadas', type: 'int', default: 0 })
  accionesImplementadas: number;

  @Column({ name: 'puntaje_cumplimiento', type: 'int', default: 0 })
  puntajeCumplimiento: number;

  @Column({ name: 'controles_implementados', type: 'varchar', length: 20 })
  controlesImplementados: 'SI' | 'NO' | 'PARCIAL';

  @Column({ name: 'hallazgo_se_repite', type: 'varchar', length: 20 })
  hallazgoSeRepite: 'SI' | 'NO';

  @Column({ name: 'puntaje_efectividad', type: 'int', default: 0 })
  puntajeEfectividad: number;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  evidencias: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}












import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum TipoEventoTimeline {
  CREACION = 'CREACION',
  ACTUALIZACION = 'ACTUALIZACION',
  APROBACION = 'APROBACION',
  COMPLETADA = 'COMPLETADA',
  EVIDENCIA = 'EVIDENCIA',
  COMENTARIO = 'COMENTARIO',
  PROGRESO = 'PROGRESO',
  ESTADO = 'ESTADO',
  HALLAZGO_COMPLETADO = 'HALLAZGO_COMPLETADO',
}

@Entity('eventos_timeline', { schema: 'control_interno' })
export class EventoTimeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_mejoramiento_id', type: 'uuid' })
  planMejoramientoId: string;

  @Column({
    type: 'enum',
    enum: TipoEventoTimeline,
    name: 'tipo',
  })
  tipo: TipoEventoTimeline;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuarioId: string;

  @Column({ name: 'usuario_nombre', type: 'varchar', length: 255, nullable: true })
  usuarioNombre: string;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}

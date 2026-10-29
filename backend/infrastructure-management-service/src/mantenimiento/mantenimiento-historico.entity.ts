import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'mantenimiento_historico_externo', schema: 'infrastructure-management' })
@Index(['origenSistema', 'idTareaExterna'], { unique: true })
export class MantenimientoHistorico {
  @PrimaryGeneratedColumn('uuid', { name: 'id_historico' })
  idHistorico: string;

  @Column({ type: 'varchar', length: 50, name: 'origen_sistema', default: 'MICROSOFT_PLANNER' })
  origenSistema: string;

  @Column({ type: 'varchar', length: 150, name: 'id_tarea_externa' })
  idTareaExterna: string;

  @Column({ type: 'text', name: 'titulo_tarea' })
  tituloTarea: string;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'deposito_semana' })
  depositoSemana?: string;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'semana_normalizada' })
  semanaNormalizada?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'estado_original' })
  estadoOriginal?: string;

  @Column({ type: 'varchar', length: 50, name: 'estado_homologado', default: 'COMPLETADO' })
  estadoHomologado: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'prioridad_original' })
  prioridadOriginal?: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'fecha_creacion' })
  fechaCreacion?: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'fecha_inicio' })
  fechaInicio?: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'fecha_vencimiento' })
  fechaVencimiento?: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'fecha_finalizacion' })
  fechaFinalizacion?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'creado_por_texto' })
  creadoPorTexto?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'completado_por_texto' })
  completadoPorTexto?: string;

  @Column({ type: 'text', nullable: true, name: 'asignado_a_texto' })
  asignadoATexto?: string;

  @Column({ type: 'int', default: 0, name: 'cantidad_asignados' })
  cantidadAsignados: number;

  @Column({ type: 'uuid', nullable: true, name: 'id_sede_homologada' })
  idSedeHomologada?: string;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'nombre_sede_sugerida' })
  nombreSedeSugerida?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'categoria_sugerida' })
  categoriaSugerida?: string;

  @Column({ type: 'varchar', length: 255, name: 'nombre_archivo_origen' })
  nombreArchivoOrigen: string;

  @Column({ type: 'int', nullable: true, name: 'numero_fila_origen' })
  numeroFilaOrigen?: number;

  @Column({ type: 'uuid', nullable: true, name: 'cargado_por_usuario_id' })
  cargadoPorUsuarioId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'cargado_por_nombre' })
  cargadoPorNombre?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_ingesta' })
  fechaIngesta: Date;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb", name: 'metadata' })
  metadata: Record<string, any>;
}

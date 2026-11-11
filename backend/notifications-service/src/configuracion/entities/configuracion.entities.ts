import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type Canal = 'plataforma' | 'correo' | 'ambos';
export const CANALES: Canal[] = ['plataforma', 'correo', 'ambos'];
export const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Crítica'] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

/** Interruptor por módulo (EFDS-2406, función 1) y canal por defecto de sus eventos. */
@Entity('modulo_notificacion', { schema: 'notifications' })
export class ModuloNotificacion {
  @PrimaryColumn({ length: 60 })
  codigo: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'varchar', name: 'canal_defecto', length: 12, default: 'ambos' })
  canal_defecto: Canal;

  @Column({ default: 100 })
  orden: number;

  /**
   * Buzón que recibe lo que habría salido mientras el módulo o un aviso suyo
   * estén apagados. NULL: lo apagado no sale a ningún lado.
   */
  @Column({ type: 'varchar', name: 'correo_desvio', length: 150, nullable: true })
  correo_desvio: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creado_en: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizado_en: Date;

  @Column({ type: 'varchar', name: 'actualizado_por', length: 150, nullable: true })
  actualizado_por: string | null;
}

/** `categoria` que hoy manda cada módulo, traducida a su código. */
@Entity('modulo_alias', { schema: 'notifications' })
export class ModuloAlias {
  @PrimaryColumn({ length: 100 })
  alias: string;

  @Column({ type: 'varchar', name: 'codigo_modulo', length: 60 })
  codigo_modulo: string;
}

/**
 * Un renglón por módulo + `tipo_notificacion`; se registra solo la primera vez
 * que llega. La clave sola no basta: dos módulos pueden emitir la misma y cada
 * uno se gobierna por separado.
 */
@Entity('evento_notificacion', { schema: 'notifications' })
export class EventoNotificacion {
  @PrimaryColumn({ type: 'varchar', name: 'codigo_modulo', length: 60 })
  codigo_modulo: string;

  @PrimaryColumn({ type: 'varchar', length: 100 })
  clave: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ default: true })
  activo: boolean;

  /** NULL hereda `canal_defecto` del módulo. */
  @Column({ type: 'varchar', length: 12, nullable: true })
  canal: Canal | null;

  @Column({ default: false })
  obligatorio: boolean;

  /** NULL deja la prioridad que trae el código. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  prioridad: Prioridad | null;

  @Column({ type: 'varchar', name: 'prioridad_codigo', length: 20, nullable: true })
  prioridad_codigo: string | null;

  @Column({ name: 'envia_correo', default: false })
  envia_correo: boolean;

  /** true cuando el código guarda campana para este evento; con envia_correo sin esto, es solo correo. */
  @Column({ name: 'envia_campana', default: false })
  envia_campana: boolean;

  @Column({ name: 'roles_adicionales', type: 'text', array: true, default: '{}' })
  roles_adicionales: string[];

  @Column({ name: 'dependencias_adicionales', type: 'bigint', array: true, default: '{}' })
  dependencias_adicionales: string[];

  @Column({ name: 'sedes_adicionales', type: 'bigint', array: true, default: '{}' })
  sedes_adicionales: string[];

  @Column({ name: 'visto_en', type: 'timestamptz', nullable: true })
  visto_en: Date | null;

  @Column({ name: 'verificado_en', type: 'timestamptz', nullable: true })
  verificado_en: Date | null;

  @Column({ type: 'varchar', name: 'verificado_por', length: 150, nullable: true })
  verificado_por: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creado_en: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizado_en: Date;

  @Column({ type: 'varchar', name: 'actualizado_por', length: 150, nullable: true })
  actualizado_por: string | null;
}

/** Valor anterior y nuevo de cada cambio hecho desde la consola (RN5). */
@Entity('configuracion_historial', { schema: 'notifications' })
export class ConfiguracionHistorial {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 20 })
  entidad: 'modulo' | 'evento';

  /** Módulo del cambio (para 'modulo' es el mismo código que `clave`). */
  @Column({ type: 'varchar', name: 'codigo_modulo', length: 60, nullable: true })
  codigo_modulo: string | null;

  @Column({ type: 'varchar', length: 100 })
  clave: string;

  @Column({ type: 'jsonb', nullable: true })
  anterior: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  nuevo: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  usuario: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;
}

/** Lo que la compuerta no dejó pasar: la huella de un aviso apagado. */
@Entity('envio_omitido', { schema: 'notifications' })
export class EnvioOmitido {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', name: 'codigo_modulo', length: 60 })
  codigo_modulo: string;

  @Column({ type: 'varchar', name: 'clave_evento', length: 100 })
  clave_evento: string;

  @Column({ type: 'varchar', length: 12 })
  canal: 'plataforma' | 'correo';

  @Column({ type: 'varchar', length: 255, nullable: true })
  destinatario: string | null;

  /** 'modulo_inactivo', 'evento_inactivo', 'canal_solo_*' o 'desviado'. */
  @Column({ type: 'varchar', length: 40 })
  motivo: string;

  /** Buzón al que fue a parar el aviso cuando el motivo es 'desviado'. */
  @Column({ type: 'varchar', name: 'desviado_a', length: 150, nullable: true })
  desviado_a: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  titulo: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;
}

export const ENTIDADES_CONFIGURACION = [
  ModuloNotificacion,
  ModuloAlias,
  EventoNotificacion,
  ConfiguracionHistorial,
  EnvioOmitido,
];

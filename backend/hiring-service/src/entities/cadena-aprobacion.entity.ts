import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * La aprobación por escalones (migración 101).
 *
 * Una actividad que exige aprobación ya no tiene un solo aprobador: tiene una
 * cadena de escalones que deciden en orden. La plantilla se configura una vez;
 * cada envío abre una ronda con la copia de la cadena que regía entonces, para
 * que cambiar la plantilla no mueva el suelo bajo lo que ya está en revisión.
 */

/** Lo que un escalón puede hacer con la actividad. Aprobar es obligatorio. */
export type AccionEscalon = 'APROBAR' | 'DEVOLVER' | 'NEGAR';

/**
 * Cómo decide un escalón con varios responsables.
 *
 * `UNO`: basta con que apruebe cualquiera, que es lo que hacía la aprobación
 * de un solo nivel. `TODOS`: tienen que aprobar todas las personas nombradas;
 * solo se admite con personas, porque «todos los del rol» cambia cada vez que
 * alguien entra o sale del rol.
 */
export type ReglaDecision = 'UNO' | 'TODOS';

/** Papeles del proceso que pueden responder por un escalón. */
export type PapelEscalon = 'ABOGADO' | 'CONTRATACION' | 'FINANCIERA' | 'SUPERVISOR';

/** Un escalón tal como se configura en la plantilla. */
export interface EscalonConfigurado {
  nombre: string;
  roles: string[];
  /** `id_person` del directorio, como guarda el buscador de Configuración. */
  personas: string[];
  papeles: PapelEscalon[];
  reglaDecision: ReglaDecision;
  acciones: AccionEscalon[];
}

@Entity('cadenas_aprobacion', { schema: 'hiring' })
export class CadenaAprobacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 160 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'jsonb' })
  escalones: EscalonConfigurado[];

  @Column({ name: 'permite_mismo_aprobador', default: false })
  permiteMismoAprobador: boolean;

  @Column({ default: true })
  activa: boolean;

  @Column({ name: 'created_by', length: 200, nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_by', length: 200, nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

export type EstadoRonda = 'EN_CURSO' | 'APROBADA' | 'DEVUELTA' | 'NEGADA' | 'RETIRADA' | 'CANCELADA';

/** Una ronda de aprobación: lo que pasó con un envío de la actividad. */
@Entity('aprobaciones', { schema: 'hiring' })
export class RondaAprobacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_actividad_id', type: 'uuid' })
  procesoActividadId: string;

  @Column({ type: 'int' })
  ronda: number;

  @Column({ name: 'cadena_id', type: 'uuid', nullable: true })
  cadenaId: string | null;

  @Column({ name: 'cadena_nombre', length: 160, nullable: true })
  cadenaNombre: string | null;

  @Column({ name: 'permite_mismo_aprobador', default: false })
  permiteMismoAprobador: boolean;

  @Column({ length: 12, default: 'EN_CURSO' })
  estado: EstadoRonda;

  @Column({ name: 'escalon_actual', type: 'int', nullable: true })
  escalonActual: number | null;

  @Column({ name: 'version_enviada', type: 'int' })
  versionEnviada: number;

  @Column({ length: 10, default: 'ENVIO' })
  origen: 'ENVIO' | 'LEGADA';

  @Column({ name: 'iniciada_por', length: 200, nullable: true })
  iniciadaPor: string | null;

  @Column({ name: 'iniciada_por_id', length: 120, nullable: true })
  iniciadaPorId: string | null;

  @CreateDateColumn({ name: 'iniciada_at', type: 'timestamptz' })
  iniciadaAt: Date;

  @Column({ name: 'cerrada_at', type: 'timestamptz', nullable: true })
  cerradaAt: Date | null;
}

export type EstadoEscalon = 'BLOQUEADO' | 'PENDIENTE' | 'APROBADO' | 'DEVUELTO' | 'NEGADO' | 'ANULADO';

/** Un escalón dentro de una ronda, con la configuración copiada al enviarla. */
@Entity('aprobacion_escalones', { schema: 'hiring' })
export class EscalonRonda {
  @PrimaryColumn({ name: 'aprobacion_id', type: 'uuid' })
  aprobacionId: string;

  @PrimaryColumn({ type: 'int' })
  orden: number;

  @Column({ length: 120 })
  nombre: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  roles: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  personas: string[];

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  papeles: PapelEscalon[];

  @Column({ name: 'regla_decision', length: 6, default: 'UNO' })
  reglaDecision: ReglaDecision;

  @Column({ type: 'text', array: true, default: () => "'{APROBAR,DEVOLVER}'" })
  acciones: AccionEscalon[];

  @Column({ length: 10, default: 'BLOQUEADO' })
  estado: EstadoEscalon;

  @Column({ name: 'activado_at', type: 'timestamptz', nullable: true })
  activadoAt: Date | null;

  @Column({ name: 'resuelto_at', type: 'timestamptz', nullable: true })
  resueltoAt: Date | null;
}



/** Numeral cuya cadena reparte la 3.3: sus escalones por rol se designan a personas (102). */
export const NUMERAL_CON_DESIGNACION = '3.1';

/**
 * Quién decide un escalón por rol de la cadena de la 3.1 en un proceso
 * (migración 102). Se designa en la 3.3, como el abogado.
 */
@Entity('designaciones_escalon', { schema: 'hiring' })
export class DesignacionEscalon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  @Column({ length: 20, default: NUMERAL_CON_DESIGNACION })
  numeral: string;

  @Column({ type: 'int' })
  escalon: number;

  @Column({ name: 'escalon_nombre', length: 120, nullable: true })
  escalonNombre: string | null;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @Column({ name: 'usuario_nombre', length: 120 })
  usuarioNombre: string;

  @Column({ name: 'persona_id', type: 'uuid', nullable: true })
  personaId: string | null;

  @Column({ length: 200 })
  nombre: string;

  @Column({ length: 10, default: 'VIGENTE' })
  estado: 'VIGENTE' | 'RELEVADO';

  @Column({ name: 'asignado_por', length: 200, nullable: true })
  asignadoPor: string | null;

  @CreateDateColumn({ name: 'asignado_at', type: 'timestamptz' })
  asignadoAt: Date;

  @Column({ name: 'relevado_at', type: 'timestamptz', nullable: true })
  relevadoAt: Date | null;

  @Column({ name: 'relevado_por', length: 200, nullable: true })
  relevadoPor: string | null;

  @Column({ name: 'motivo_relevo', type: 'text', nullable: true })
  motivoRelevo: string | null;
}

export const ENTIDADES_APROBACION = [CadenaAprobacion, RondaAprobacion, EscalonRonda, DesignacionEscalon];

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type TipoRegla =
  | 'CAMPO_OBLIGATORIO'
  | 'DOCUMENTO_REQUERIDO'
  | 'RANGO_VALOR'
  | 'PLAZO_MINIMO'
  | 'BLOQUEA_AVANCE'
  | 'REGLA_DERIVADA'
  /** La actividad no se cierra sin que alguien la apruebe (EFDS-1183). */
  | 'EXIGE_APROBACION';


/** Como se compara un dato del formulario con un valor esperado. */
export type Operador = 'ES' | 'NO_ES' | 'MAYOR_QUE' | 'MENOR_QUE' | 'ESTA_VACIO' | 'TIENE_VALOR';

/** Que hace la regla cuando sus condiciones se cumplen. */
export type TipoAccion =
  | 'EXIGIR_CAMPO'
  | 'MOSTRAR_CAMPO'
  | 'OCULTAR_CAMPO'
  | 'EXIGIR_DOCUMENTO'
  | 'BLOQUEAR_AVANCE';

export interface Condicion {
  /** Codigo del campo, o `modalidad` para condicionar por la del proceso. */
  campo: string;
  operador: Operador;
  valor?: any;
}

export interface Accion {
  accion: TipoAccion;
  /** El campo, el tipo de documento o el numeral, segun la accion. */
  objetivo: string;
  valor?: any;
}

/**
 * Condición que debe cumplirse para dar por terminada una actividad.
 *
 * Vive en base de datos y no en código porque cambia con la normativa: el
 * tope de Mínima Cuantía se actualiza cada año, y ajustarlo no debería
 * requerir un despliegue.
 */
@Entity('reglas_actividad', { schema: 'hiring' })
export class ReglaActividad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 10 })
  numeral: string;

  /** NULL = aplica a todas las modalidades. */
  @Column({ length: 60, nullable: true })
  modalidad: string | null;

  @Column({ length: 30 })
  tipo: TipoRegla;

  /**
   * Detalle de la condición. Su forma depende del tipo: un umbral necesita
   * `max`, un plazo necesita `dias`, un campo obligatorio necesita `codigo`.
   */
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  config: Record<string, any>;

  /**
   * Cuando aplica la regla. Vacio = siempre.
   *
   * Es lo que permite que el formulario reaccione: sin condiciones una regla
   * solo puede exigir algo de forma fija.
   */
  @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
  condiciones: Condicion[];

  /** Que hace cuando las condiciones se cumplen. */
  @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
  acciones: Accion[];

  /** Como se combinan las condiciones entre si. */
  @Column({ length: 3, default: 'AND' })
  conector: 'AND' | 'OR';

  /** Lo que ve el gestor cuando la regla no se cumple. */
  @Column({ type: 'text', nullable: true })
  mensaje: string | null;

  @Column({ type: 'int', default: 100 })
  orden: number;

  @Column({ name: 'vigente_desde', type: 'timestamptz' })
  vigenteDesde: Date;

  /**
   * Una regla derogada se cierra en vez de borrarse: un proceso aprobado bajo
   * ella debe poder auditarse con las reglas que estaban vigentes entonces.
   */
  @Column({ name: 'vigente_hasta', type: 'timestamptz', nullable: true })
  vigenteHasta: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

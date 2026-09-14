import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type EstadoRegistroActividad = 'VIGENTE' | 'ANULADO';

/**
 * Constancia de que una actividad sin historia propia ocurrió (migración 051).
 *
 * Once actividades de la matriz —las cuatro que acompañan al estudio previo,
 * las tres de participación previa a la apertura y las cuatro del cierre de la
 * etapa 6— se resuelven por fuera de la plataforma. No se modelan una a una
 * porque lo que la entidad necesita de todas es lo mismo: cuándo pasó, qué
 * pasó y con qué se respalda.
 */
@Entity('registros_actividad', { schema: 'hiring' })
export class RegistroActividad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  @Column({ length: 20 })
  numeral: string;

  /** Cuándo ocurrió el hecho, no cuándo se transcribió. */
  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'text' })
  nota: string;

  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId: string | null;

  /** Lo propio de cada actividad: el sí/no del sorteo, el radicado de la 3.3. */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  datos: Record<string, any>;

  @Column({ length: 20, default: 'VIGENTE' })
  estado: EstadoRegistroActividad;

  @Column({ name: 'registrado_por', length: 200, nullable: true })
  registradoPor: string | null;

  @CreateDateColumn({ name: 'registrado_at', type: 'timestamptz' })
  registradoAt: Date;

  @Column({ name: 'anulado_at', type: 'timestamptz', nullable: true })
  anuladoAt: Date | null;

  @Column({ name: 'anulado_por', length: 200, nullable: true })
  anuladoPor: string | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;
}

/**
 * Qué actividades admiten este registro y cuáles exigen soporte.
 *
 * Parámetro y no constante: `confirmado` dice cuáles salen de la matriz y
 * cuáles son suposición del equipo a la espera de la Dirección de Contratación.
 */
@Entity('actividades_con_soporte', { schema: 'hiring' })
export class ActividadConSoporte {
  @PrimaryColumn({ length: 20 })
  numeral: string;

  @Column({ type: 'int' })
  etapa: number;

  @Column({ name: 'exige_soporte', default: false })
  exigeSoporte: boolean;

  @Column({ default: false })
  confirmado: boolean;

  @Column({ name: 'nota_fuente', type: 'text', nullable: true })
  notaFuente: string | null;
}

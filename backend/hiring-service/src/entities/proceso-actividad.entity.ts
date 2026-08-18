import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

/**
 * BORRADOR → EN_REVISION → APROBADO
 *                        ↘ DEVUELTO → BORRADOR (el gestor corrige y reenvía)
 *
 * NO_APLICA es aparte: la actividad no aplica a la modalidad del proceso y no
 * recorre el ciclo anterior. Se instancia igual, en vez de omitirse, para que
 * el expediente deje constancia de por qué el proceso tuvo menos pasos.
 */
export type EstadoActividad = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'DEVUELTO' | 'NO_APLICA';

/** Numeral 3.1 de la matriz: elaboración del estudio previo. */
export const NUMERAL_ESTUDIO_PREVIO = '3.1';

@Entity('proceso_actividades', { schema: 'hiring' })
@Unique('uq_proceso_numeral', ['procesoId', 'numeral'])
export class ProcesoActividad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  @Column({ length: 20 })
  numeral: string;

  @Column({ length: 30, default: 'BORRADOR' })
  estado: EstadoActividad;

  /** Valores del formulario, con la forma que define campos_formulario. */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  datos: Record<string, any>;

  /** Optimistic lock: se incrementa en cada guardado. */
  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'enviado_por', length: 120, nullable: true })
  enviadoPor: string;

  @Column({ name: 'enviado_at', type: 'timestamptz', nullable: true })
  enviadoAt: Date;

  @Column({ name: 'revisado_por', length: 120, nullable: true })
  revisadoPor: string;

  @Column({ name: 'revisado_at', type: 'timestamptz', nullable: true })
  revisadoAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

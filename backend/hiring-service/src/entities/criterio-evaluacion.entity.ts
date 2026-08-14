import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Las cuatro dimensiones de la evaluación (RF-PUB-07). */
export type DimensionEvaluacion = 'JURIDICO' | 'FINANCIERO' | 'TECNICO' | 'ECONOMICO';

/**
 * Habilitante y ponderable no son dos etiquetas del mismo dato: el primero
 * decide si la oferta sigue en carrera, el segundo cuánto suma. Un cero en un
 * ponderable es una calificación; en un habilitante sería quedar fuera.
 */
export type TipoCriterio = 'HABILITANTE' | 'PONDERABLE';

/**
 * La dimensión económica no la evalúa una persona.
 *
 * La matriz de roles nombra evaluador jurídico, financiero y técnico, y ninguno
 * económico, porque el precio se califica con una fórmula sobre el valor
 * ofertado. Está aquí para que quien lea el catálogo no lo busque.
 *
 * Se declara como literal y no como `DimensionEvaluacion` a propósito: así,
 * descartarla en una comparación deja las tres que sí evalúa una persona, que
 * es exactamente el conjunto de roles del comité.
 */
export const DIMENSION_CALCULADA = 'ECONOMICO' as const;

@Entity('criterios_evaluacion', { schema: 'hiring' })
export class CriterioEvaluacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nulo significa que aplica a todas las modalidades.
   *
   * La historia dice que los ponderables varían por modalidad sin cifrar cómo,
   * así que se admiten los dos casos en vez de repetir el mismo criterio once
   * veces.
   */
  @Column({ length: 60, nullable: true })
  modalidad: string | null;

  @Column({ length: 20 })
  dimension: DimensionEvaluacion;

  @Column({ length: 20 })
  tipo: TipoCriterio;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  /** Solo en los ponderables; en un habilitante no hay puntaje que dar. */
  @Column({ name: 'puntaje_maximo', type: 'numeric', precision: 6, scale: 2, nullable: true })
  puntajeMaximo: string | null;

  @Column({ type: 'int', default: 0 })
  orden: number;

  /** Un criterio ya usado no se borra, se desactiva. */
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'text', nullable: true })
  fundamento: string | null;

  /** False mientras la Dirección de Contratación no lo confirme. */
  @Column({ type: 'boolean', default: false })
  confirmado: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

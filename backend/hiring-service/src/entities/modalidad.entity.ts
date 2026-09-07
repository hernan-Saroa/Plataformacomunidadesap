import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Modalidad de selección del contratista.
 *
 * Es la columna de la matriz de flujo: determina cuáles de las 63 actividades
 * aplican al proceso. Se elige al crearlo porque sin ella no se puede armar el
 * flujo.
 */
@Entity('modalidades', { schema: 'hiring' })
export class Modalidad {
  @PrimaryColumn({ length: 60 })
  codigo: string;

  @Column({ length: 160 })
  nombre: string;

  /** Orden de la columna en la matriz; conserva su lectura. */
  @Column({ type: 'int' })
  orden: number;

  /** Las derogadas dejan de ofrecerse sin romper los procesos que las usan. */
  @Column({ type: 'boolean', default: true })
  activa: boolean;
}

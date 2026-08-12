import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Etapa 4 de la matriz: el ciclo del CDP. */
export const ETAPA_CDP = 4;

/**
 * Actividad de la matriz de flujo.
 *
 * Vive en base de datos y no en una constante del microfrontend porque la
 * matriz tiene 63 actividades repartidas en 10 etapas: mantenerlas en el
 * bundle obligaría a desplegar para corregir el nombre de una.
 */
@Entity('actividades', { schema: 'hiring' })
export class Actividad {
  @PrimaryColumn({ length: 20 })
  numeral: string;

  @Column({ type: 'int' })
  etapa: number;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'int' })
  orden: number;

  @Column({ type: 'boolean', default: true })
  activa: boolean;
}

/**
 * Celda marcada NO en la matriz: la actividad no aplica a esa modalidad.
 *
 * Se registran solo las exclusiones y no la matriz completa: de 63 actividades
 * por 11 modalidades, la inmensa mayoría de celdas son SI, y guardar solo las
 * excepciones deja el dato en decenas de filas en vez de setecientas.
 */
@Entity('actividades_excluidas', { schema: 'hiring' })
export class ActividadExcluida {
  @PrimaryColumn({ length: 20 })
  numeral: string;

  @PrimaryColumn({ length: 60 })
  modalidad: string;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;
}

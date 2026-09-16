import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Causal que habilita contratar por una modalidad — actividad 3.6.
 *
 * La matriz la numera 3.5.1, colgada de la modalidad, y la describe como
 * «filtro según la modalidad»: solo la marca aplicable en selección abreviada
 * de menor cuantía y en contratación directa, donde además la celda trae la
 * norma en vez de un SI.
 *
 * En tabla y no en un enum del código, como las modalidades: una reforma que
 * agregue o derogue una causal se atiende con un INSERT o un UPDATE de
 * `activa`, sin desplegar.
 */
@Entity('causales_contratacion', { schema: 'hiring' })
export class CausalContratacion {
  @PrimaryColumn({ length: 60 })
  codigo: string;

  /**
   * De qué modalidad es la causal, que es el filtro en sí.
   *
   * Una causal pertenece a una modalidad —la urgencia manifiesta no habilita
   * una menor cuantía—, así que va en la fila y no en una tabla de cruce.
   */
  @Column({ length: 60 })
  modalidad: string;

  @Column({ length: 300 })
  nombre: string;

  /** La disposición que la sustenta, tal como se cita en el expediente. */
  @Column({ name: 'referencia_normativa', length: 200 })
  referenciaNormativa: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  /** Las derogadas dejan de ofrecerse sin romper los procesos que las usaron. */
  @Column({ type: 'boolean', default: true })
  activa: boolean;

  /**
   * Si la Dirección de Contratación ratificó la fila.
   *
   * Mismo criterio que `actividades_con_soporte.confirmado`: la semilla sale de
   * la lectura del equipo sobre la Ley 1150 de 2007 y viaja diciéndolo, en vez
   * de pasar por un anexo firmado que nadie firmó.
   */
  @Column({ type: 'boolean', default: false })
  confirmada: boolean;
}

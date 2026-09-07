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

  /** Días hábiles previstos para completarla. Nulo = sin plazo definido. */
  @Column({ name: 'plazo_dias', type: 'int', nullable: true })
  plazoDias: number | null;

  /**
   * Cargo que responde por la actividad, no la persona.
   *
   * La configuración dice quién aprueba —«Director de Contratación»—, y quien
   * ocupa el cargo cambia sin que cambie el proceso.
   */
  @Column({ name: 'responsable_cargo', length: 200, nullable: true })
  responsableCargo: string | null;

  /**
   * Cuántos días antes del vencimiento avisar. Nulo = sin aviso.
   *
   * El dato se configura y se muestra; enviarlo queda para cuando exista el
   * motor de notificaciones, que hoy no vive en este servicio.
   */
  @Column({ name: 'alerta_dias_antes', type: 'int', nullable: true })
  alertaDiasAntes: number | null;
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

/**
 * Celda que aplica pero con una condición o una variante propia.
 *
 * La matriz no es booleana: doce celdas dicen "si*" y ocho traen texto libre
 * —"TVEC", "Comunicación de aceptación"—. Sin esta tabla las veinte llegan
 * como un SI cualquiera y la pantalla de configuración no puede mostrar la
 * diferencia entre una actividad que se comporta igual en todas partes y una
 * que produce otro documento según la modalidad.
 */
@Entity('actividades_salvedad', { schema: 'hiring' })
export class ActividadSalvedad {
  @PrimaryColumn({ length: 20 })
  numeral: string;

  @PrimaryColumn({ length: 60 })
  modalidad: string;

  /** El texto de la celda cuando no dice SI. NULL cuando la celda es "si*". */
  @Column({ type: 'text', nullable: true })
  variante: string | null;

  @Column({ type: 'text' })
  nota: string;
}

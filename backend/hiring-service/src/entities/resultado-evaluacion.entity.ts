import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Vigente y rectificado, no un borrado.
 *
 * Mismo criterio que el comité: corregir un resultado es rectificar el anterior
 * y registrar otro. El primero existió, se pudo trasladar a los oferentes y
 * tiene su informe en el expediente; borrarlo contaría otra historia.
 */
export type EstadoResultado = 'VIGENTE' | 'RECTIFICADO';

/**
 * Resultado de la evaluación del proceso (actividad 6.3, EFDS-1157).
 *
 * El comité evalúa por fuera de la plataforma, con sus formatos y su cuadro
 * comparativo, y elige la ganadora. Aquí no se califica nada: se recibe la
 * decisión ya tomada, su valoración y el informe que la sustenta. Los números
 * entran como los reporta el comité y la plataforma no los recalcula, porque no
 * tiene con qué.
 */
@Entity('resultados_evaluacion', { schema: 'hiring' })
export class ResultadoEvaluacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  /** La oferta que el comité eligió, de entre las que el proceso recibió. */
  @Column({ name: 'oferente_id' })
  oferenteId: string;

  /** El informe del comité. Sin él sería la opinión de quien digitó. */
  @Column({ name: 'informe_documento_id' })
  informeDocumentoId: string;

  /**
   * La nota de la ganadora y sobre cuánto se dio.
   *
   * Nulas cuando la modalidad no puntúa —en mínima cuantía suele bastar con el
   * menor precio que cumple—, y siempre las dos juntas: un 85 sin saber sobre
   * cuánto no dice nada.
   */
  @Column({ name: 'puntaje_obtenido', type: 'numeric', precision: 6, scale: 2, nullable: true })
  puntajeObtenido: string | null;

  @Column({ name: 'puntaje_maximo', type: 'numeric', precision: 6, scale: 2, nullable: true })
  puntajeMaximo: string | null;

  /**
   * El valor por el que se evalúa la ganadora.
   *
   * Aparte del `valorOfertado` de la oferta porque puede no coincidir: una
   * corrección aritmética del comité cambia la cifra que se adjudica sin
   * reescribir lo que el oferente presentó.
   */
  @Column({ name: 'valor_evaluado', type: 'numeric', precision: 18, scale: 2, nullable: true })
  valorEvaluado: string | null;

  /** Por qué esa y no otra: es lo que el traslado del informe le muestra a los demás. */
  @Column({ type: 'text' })
  justificacion: string;

  @Column({ length: 20, default: 'VIGENTE' })
  estado: EstadoResultado;

  @Column({ name: 'registrado_por', length: 200, nullable: true })
  registradoPor: string | null;

  @CreateDateColumn({ name: 'registrado_at', type: 'timestamptz' })
  registradoAt: Date;

  @Column({ name: 'rectificado_at', type: 'timestamptz', nullable: true })
  rectificadoAt: Date | null;

  @Column({ name: 'rectificado_por', length: 200, nullable: true })
  rectificadoPor: string | null;

  @Column({ name: 'motivo_rectificacion', type: 'text', nullable: true })
  motivoRectificacion: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

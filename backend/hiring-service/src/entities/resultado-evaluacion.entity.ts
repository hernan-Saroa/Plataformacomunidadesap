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
 * Evaluación preliminar del proceso (actividad 6.3, EFDS-1157).
 *
 * El comité evalúa por fuera de la plataforma y entrega un informe consolidado,
 * en uno o varios archivos. Aquí no se califica nada ni se nombra ganadora
 * (120): se recibe el informe, que es el soporte de la 6.3 y de la 6.4. Los
 * puntajes y la ganadora de antes de la 120 se conservan como se registraron.
 */
@Entity('resultados_evaluacion', { schema: 'hiring' })
export class ResultadoEvaluacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  /**
   * La ganadora que nombraba el comité antes de la 120.
   *
   * Nula desde entonces: la evaluación de la 6.3 es preliminar y todavía no se
   * sabe qué oferta gana. La ganadora se decide en el informe definitivo (7.2).
   */
  @Column({ name: 'oferente_id', type: 'uuid', nullable: true })
  oferenteId: string | null;

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

  /** Observación del informe preliminar; opcional desde la 120. */
  @Column({ type: 'text', nullable: true })
  justificacion: string | null;

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

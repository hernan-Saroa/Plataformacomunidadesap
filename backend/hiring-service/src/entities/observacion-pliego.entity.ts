import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Observación de un interesado al proyecto de pliego publicado (EFDS-1151).
 *
 * Las observaciones llegan por SECOP II y la plataforma no habla con SECOP, así
 * que el gestor las transcribe con su soporte. Lo que la entidad debe poder
 * demostrar es que las recibió y que las respondió.
 */
@Entity('observaciones_pliego', { schema: 'hiring' })
export class ObservacionPliego {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  /**
   * La publicación observada, no solo el proceso: si esa publicación se anula y
   * se registra otra, cada una conserva las observaciones que recibió.
   */
  @Column({ name: 'publicacion_id', type: 'uuid' })
  publicacionId: string;

  /** El interesado tal como aparece en SECOP; opcional desde la 127. */
  @Column({ name: 'presentado_por', length: 200, nullable: true })
  presentadoPor: string | null;

  /** Opcional: una observación anónima igual hay que responderla. */
  @Column({ length: 60, nullable: true })
  identificacion: string | null;

  /**
   * Fecha en que el interesado la presentó, no la del registro: es la que
   * decide si llegó en término.
   */
  @Column({ name: 'fecha_presentacion', type: 'date' })
  fechaPresentacion: string;

  @Column({ length: 300, nullable: true })
  asunto: string | null;

  /** La observación general del interesado; el detalle va en los archivos. */
  @Column({ type: 'text' })
  contenido: string;

  /**
   * Congelado al registrar: depende del vencimiento que tenía la publicación
   * ese día. Llegar tarde no impide registrarla — es información del
   * expediente, y perderla sería peor que guardarla marcada.
   */
  @Column({ name: 'fuera_de_termino', type: 'boolean', default: false })
  fueraDeTermino: boolean;

  /** El único soporte de antes de la 127; ahora van en `soportesDocumentoIds`. */
  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId: string | null;

  /** Archivos con el detalle de sus observaciones (127). */
  @Column({ name: 'soportes_documento_ids', type: 'uuid', array: true, default: () => "'{}'" })
  soportesDocumentoIds: string[];

  @Column({ name: 'registrado_por', length: 160, nullable: true })
  registradoPor: string | null;

  @Column({ type: 'text', nullable: true })
  respuesta: string | null;

  @Column({ name: 'respondida_por', length: 160, nullable: true })
  respondidaPor: string | null;

  @Column({ name: 'respondida_at', type: 'timestamptz', nullable: true })
  respondidaAt: Date | null;

  /**
   * Si la observación llevó a cambiar el pliego. Es lo que justifica una adenda
   * posterior y lo que muestra que la observación sirvió de algo.
   */
  @Column({ name: 'modifico_pliego', type: 'boolean', nullable: true })
  modificoPliego: boolean | null;

  /** El documento de respuestas: en una respuesta general, el mismo para todos (127). */
  @Column({ name: 'respuesta_soportes_ids', type: 'uuid', array: true, default: () => "'{}'" })
  respuestaSoportesIds: string[];

  /** Si se respondió con el documento general de la actividad (127). */
  @Column({ name: 'respuesta_general', type: 'boolean', default: false })
  respuestaGeneral: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Etapa 5 de la matriz: elaboración y publicación del proceso. */
export const ETAPA_PUBLICACION = 5;

/**
 * Publicación del proyecto de pliego en SECOP II (EFDS-1150, RF-PUB-01).
 *
 * No hay integración con SECOP II (EFDS-1386), así que esto no es un espejo de
 * lo que pasó allá: es el registro de que ocurrió, con su evidencia adjunta y
 * el conteo del plazo legal de publicidad que arranca ese día.
 */
@Entity('publicaciones_pliego', { schema: 'hiring' })
export class PublicacionPliego {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  /**
   * Fecha real de publicación en SECOP II, no la del registro: es la que
   * arranca el plazo, y el usuario puede estar registrando días después algo
   * que ya ocurrió.
   */
  @Column({ name: 'fecha_publicacion', type: 'date' })
  fechaPublicacion: string;

  /**
   * Plazo vigente el día del registro, congelado a propósito.
   *
   * Si mañana se corrige el plazo de la modalidad, los procesos ya publicados
   * deben seguir explicándose con la regla que estaba vigente ese día. Null
   * cuando la modalidad no lo tiene parametrizado: la publicación se registra
   * igual —el hecho ocurrió— pero no hay término que contar.
   */
  @Column({ name: 'plazo_dias_habiles', type: 'int', nullable: true })
  plazoDiasHabiles: number | null;

  @Column({ name: 'fecha_vencimiento', type: 'date', nullable: true })
  fechaVencimiento: string | null;

  @Column({ name: 'secop_numero', length: 60, nullable: true })
  secopNumero: string | null;

  /** Permite verificar la publicación desde el expediente sin ir a buscarla. */
  @Column({ name: 'secop_url', type: 'text', nullable: true })
  secopUrl: string | null;

  /**
   * La evidencia de que el pliego se publicó, obligatoria.
   *
   * Sin integración con SECOP II el soporte es lo único que sostiene el
   * registro, y el registro arranca un plazo legal. No se admite publicación
   * sin evidencia: corregirla es anularla y volver a registrarla.
   */
  @Column({ name: 'documento_id', type: 'uuid' })
  documentoId: string;

  @Column({ name: 'publicado_por', length: 160, nullable: true })
  publicadoPor: string | null;

  /**
   * Una publicación con la fecha equivocada no se borra: se anula y se registra
   * la correcta. Cada una conserva su evidencia y queda el rastro.
   */
  @Column({ name: 'anulada_at', type: 'timestamptz', nullable: true })
  anuladaAt: Date | null;

  @Column({ name: 'anulada_por', length: 160, nullable: true })
  anuladaPor: string | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

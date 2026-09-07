import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Anulada no se borra: es la que explica por qué hubo que repetir la audiencia.
 */
export type EstadoAudiencia = 'CELEBRADA' | 'ANULADA';

/**
 * Audiencia de adjudicación — actividad 7.1 (EFDS-1159).
 *
 * Un acto presencial cuyo rastro son documentos: la matriz la describe como
 * "cargue de observaciones y respuestas, acta y grabaciones". La plataforma no
 * la celebra ni la transmite; registra que ocurrió y guarda lo que la prueba.
 */
@Entity('audiencias_adjudicacion', { schema: 'hiring' })
export class AudienciaAdjudicacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  /**
   * Con hora, a diferencia de los términos en días hábiles: una audiencia se
   * celebra a una hora concreta y así consta en el acta.
   */
  @Column({ name: 'celebrada_at', type: 'timestamptz' })
  celebradaAt: Date;

  /**
   * Quién la presidió, tal como firma el acta.
   *
   * Texto y no una llave a usuarios: puede presidirla alguien sin cuenta en la
   * plataforma, y lo que importa es lo que dice el acta.
   */
  @Column({ name: 'presidida_por', length: 200 })
  presididaPor: string;

  /** Obligatoria: una audiencia sin acta no se puede probar. */
  @Column({ name: 'acta_documento_id' })
  actaDocumentoId: string;

  @Column({ type: 'text', nullable: true })
  resumen: string | null;

  @Column({ length: 20, default: 'CELEBRADA' })
  estado: EstadoAudiencia;

  @Column({ name: 'registrada_por', length: 200, nullable: true })
  registradaPor: string | null;

  @Column({ name: 'registrada_at', type: 'timestamptz', default: () => 'now()' })
  registradaAt: Date;

  @Column({ name: 'anulada_at', type: 'timestamptz', nullable: true })
  anuladaAt: Date | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

/**
 * Una grabación no se lee como una respuesta a una observación: el tipo evita
 * que la pantalla tenga que adivinar qué es cada archivo.
 */
export type TipoPiezaAudiencia = 'GRABACION' | 'OBSERVACION' | 'ANEXO';

/** Lo que documenta la audiencia además del acta. */
@Entity('piezas_audiencia', { schema: 'hiring' })
export class PiezaAudiencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'audiencia_id' })
  audienciaId: string;

  @Column({ name: 'documento_id' })
  documentoId: string;

  @Column({ length: 20 })
  tipo: TipoPiezaAudiencia;

  @Column({ length: 300 })
  descripcion: string;

  @Column({ name: 'cargada_por', length: 200, nullable: true })
  cargadaPor: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}

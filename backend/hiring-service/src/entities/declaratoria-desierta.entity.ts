import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Por qué el proceso no terminó en contrato.
 *
 * Dos caminos distintos del expediente y no un solo "no hay ofertas
 * habilitadas": el primero no tiene comité que lo sustente, el segundo sí y por
 * eso exige su informe.
 */
export type CausalDesierta = 'SIN_OFERTAS' | 'SIN_OFERTAS_HABILITADAS';

/**
 * Revocada no se borra: la declaratoria pudo notificarse y publicarse, y hay
 * terceros que la conocieron. Mismo criterio del acto de adjudicación.
 */
export type EstadoDesierta = 'VIGENTE' | 'REVOCADA';

/**
 * Declaratoria desierta del proceso — etapa 7 (EFDS-1160, RF-ADJ-02).
 *
 * El otro desenlace posible de la etapa: la adjudicación (EFDS-1159) o esto.
 *
 * No cuelga del traslado, a diferencia de todo lo demás de la etapa 7. Cuando
 * el comité no habilita a ninguna oferta no hay resultado que registrar —el
 * modelo exige nombrar una ganadora— y por tanto no hay informe preliminar ni
 * traslado que cerrar. La declaratoria llega por su propio camino y trae el
 * informe del comité como documento propio.
 */
@Entity('declaratorias_desiertas', { schema: 'hiring' })
export class DeclaratoriaDesierta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  @Column({ length: 30 })
  causal: CausalDesierta;

  /**
   * La motivación del acto.
   *
   * Obligatoria: la declaratoria desierta es un acto administrativo motivado, y
   * es lo que un tercero lee para entender por qué el proceso no terminó en
   * contrato.
   */
  @Column({ type: 'text' })
  motivo: string;

  @Column({ name: 'numero_acto', length: 60 })
  numeroActo: string;

  @Column({ name: 'fecha_acto', type: 'date' })
  fechaActo: string;

  /** La resolución firmada. Obligatoria: sin ella no hay declaratoria. */
  @Column({ name: 'acto_documento_id' })
  actoDocumentoId: string;

  /**
   * El informe con que el comité dice que ninguna oferta quedó habilitada.
   *
   * Obligatorio cuando la causal es esa y nulo cuando no se presentó nadie: sin
   * ofertas no hay comité que haya evaluado nada.
   */
  @Column({ name: 'informe_comite_documento_id', type: 'uuid', nullable: true })
  informeComiteDocumentoId: string | null;

  /** Cuántas ofertas había el día del acto, fotografiadas como en los informes. */
  @Column({ name: 'ofertas_recibidas', type: 'int', default: 0 })
  ofertasRecibidas: number;

  /**
   * De qué resultado del comité se apartó la declaratoria, si había uno.
   *
   * Declarar desierto cuando el comité ya nombró una ganadora no se impide
   * —puede haber razones— pero no puede pasar en silencio.
   */
  @Column({ name: 'resultado_contradicho_id', type: 'uuid', nullable: true })
  resultadoContradichoId: string | null;

  @Column({ name: 'notificada_at', type: 'timestamptz', nullable: true })
  notificadaAt: Date | null;

  @Column({ name: 'publicada_at', type: 'timestamptz', nullable: true })
  publicadaAt: Date | null;

  /** Soporte de la publicación: no hay integración con SECOP II. */
  @Column({ name: 'evidencia_documento_id', type: 'uuid', nullable: true })
  evidenciaDocumentoId: string | null;

  @Column({ length: 20, default: 'VIGENTE' })
  estado: EstadoDesierta;

  @Column({ name: 'declarada_por', length: 200, nullable: true })
  declaradaPor: string | null;

  @Column({ name: 'declarada_at', type: 'timestamptz', default: () => 'now()' })
  declaradaAt: Date;

  @Column({ name: 'revocada_at', type: 'timestamptz', nullable: true })
  revocadaAt: Date | null;

  @Column({ name: 'revocada_por', length: 200, nullable: true })
  revocadaPor: string | null;

  @Column({ name: 'motivo_revocacion', type: 'text', nullable: true })
  motivoRevocacion: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Apertura del sobre económico en audiencia — actividad 7.2 (EFDS-1159).
 *
 * La matriz deja esta actividad para la licitación de obra pública: allí la
 * oferta económica llega en sobre cerrado y se abre delante de todos. Dónde
 * aplica se lee de `actividades_excluidas`, no de una lista en el código.
 */
@Entity('sobres_economicos', { schema: 'hiring' })
@Unique('uq_sobre_oferta', ['audienciaId', 'oferenteId'])
export class SobreEconomico {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'audiencia_id' })
  audienciaId: string;

  @Column({ name: 'oferente_id' })
  oferenteId: string;

  /**
   * Lo que traía el sobre.
   *
   * Se guarda aquí y no se pisa `oferentes.valor_ofertado` porque son dos
   * hechos distintos: lo que el oferente declaró al presentarse y lo que
   * resultó al abrir el sobre. Que coincidan es lo normal; que no coincidan es
   * justamente lo que hay que poder ver.
   */
  @Column({ name: 'valor_ofertado', type: 'numeric', precision: 18, scale: 2 })
  valorOfertado: string;

  /** Evidencia de la apertura: no hay integración con SECOP II. */
  @Column({ name: 'evidencia_documento_id', type: 'uuid', nullable: true })
  evidenciaDocumentoId: string | null;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @Column({ name: 'abierto_por', length: 200, nullable: true })
  abiertoPor: string | null;

  @Column({ name: 'abierto_at', type: 'timestamptz', default: () => 'now()' })
  abiertoAt: Date;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}

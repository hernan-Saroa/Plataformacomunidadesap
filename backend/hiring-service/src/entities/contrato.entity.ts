import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * El ciclo del contrato: se genera, el proponente lo acepta y las dos partes lo
 * firman.
 *
 * Rechazar no borra: si el proponente no acepta la minuta, la entidad corrige y
 * genera otra, y las dos quedan en el expediente. Un contrato rechazado existió
 * y es lo que explica que un proceso tenga dos minutas.
 *
 * `PERFECCIONADO` lo deriva el servicio al comprobar que ya están las dos
 * firmas (EFDS-1162); no lo declara quien firma.
 */
export type EstadoContrato =
  | 'GENERADO'
  | 'ACEPTADO'
  | 'RECHAZADO'
  | 'PERFECCIONADO'
  | 'LEGALIZADO';

/** Determina si la legalización exigirá ARL (EFDS-1164, criterio 2). */
export type TipoPersona = 'NATURAL' | 'JURIDICA';

@Entity('contratos', { schema: 'hiring' })
export class Contrato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id' })
  procesoId: string;

  @Column({ length: 60 })
  tipologia: string;

  /** Número de contrato de la entidad, el que va en la minuta. */
  @Column({ length: 60 })
  numero: string;

  @Column({ type: 'text' })
  objeto: string;

  /**
   * `numeric` llega como string desde el driver; el transformer lo devuelve como
   * número para que la pantalla no formatee cadenas.
   */
  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: {
      to: (valor: number) => valor,
      from: (valor: string | null) => (valor === null ? null : Number(valor)),
    },
  })
  valor: number;

  @Column({ name: 'plazo_dias', type: 'int', nullable: true })
  plazoDias: number | null;

  /**
   * Datos del adjudicatario copiados, no referenciados.
   *
   * El contrato dice con quién se contrató ese día: si mañana se corrige el
   * registro del oferente, la minuta tiene que seguir diciendo lo que dice.
   */
  @Column({ name: 'contratista_documento', length: 40 })
  contratistaDocumento: string;

  @Column({ name: 'contratista_nombre', length: 300 })
  contratistaNombre: string;

  @Column({ name: 'contratista_tipo', length: 20 })
  contratistaTipo: TipoPersona;

  /** La minuta diligenciada que se subió. Es el documento, no la plantilla. */
  @Column({ name: 'minuta_documento_id' })
  minutaDocumentoId: string;

  /** De qué formato del SIG salió; nulo si no estaba cargado en la biblioteca. */
  @Column({ name: 'plantilla_id', type: 'uuid', nullable: true })
  plantillaId: string | null;

  @Column({ length: 20, default: 'GENERADO' })
  estado: EstadoContrato;

  @Column({ name: 'generado_por', length: 200, nullable: true })
  generadoPor: string | null;

  @Column({ name: 'generado_at', type: 'timestamptz' })
  generadoAt: Date;

  @Column({ name: 'aceptado_at', type: 'timestamptz', nullable: true })
  aceptadoAt: Date | null;

  @Column({ name: 'aceptado_por', length: 200, nullable: true })
  aceptadoPor: string | null;

  @Column({ name: 'aceptado_observacion', type: 'text', nullable: true })
  aceptadoObservacion: string | null;

  @Column({ name: 'rechazado_at', type: 'timestamptz', nullable: true })
  rechazadoAt: Date | null;

  @Column({ name: 'rechazado_por', length: 200, nullable: true })
  rechazadoPor: string | null;

  @Column({ name: 'motivo_rechazo', type: 'text', nullable: true })
  motivoRechazo: string | null;

  /** Cuándo entró la segunda firma y el contrato quedó suscrito (EFDS-1162). */
  @Column({ name: 'perfeccionado_at', type: 'timestamptz', nullable: true })
  perfeccionadoAt: Date | null;

  /**
   * El contrato ya suscrito, con las dos firmas incorporadas.
   *
   * Distinto de la minuta: aquella es el texto que se presentó al proponente,
   * este es el documento firmado por ambas partes.
   */
  @Column({ name: 'contrato_firmado_documento_id', type: 'uuid', nullable: true })
  contratoFirmadoDocumentoId: string | null;

  /**
   * Cuándo quedó legalizado (EFDS-1164).
   *
   * Se alcanza con todas las garantías aprobadas y, si el contratista es
   * persona natural, la ARL registrada. Lo deriva el servicio.
   */
  @Column({ name: 'legalizado_at', type: 'timestamptz', nullable: true })
  legalizadoAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

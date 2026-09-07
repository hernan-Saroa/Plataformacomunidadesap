import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Etapa 10 — Seguimiento, Control y Liquidación. */
export const ETAPA_LIQUIDACION = 10;

/** Actividad 10.1 de la matriz: el informe final de ejecución. */
export const NUMERAL_INFORME_FINAL = '10.1';

/**
 * Vigente y anulado, no un borrado.
 *
 * El informe final soporta la liquidación. Si hay que rehacerlo, el anterior
 * queda: es lo que explica que un contrato tenga dos balances distintos.
 */
export type EstadoInformeFinal = 'VIGENTE' | 'ANULADO';

/**
 * La fotografía de la ejecución el día en que se firmó el informe.
 *
 * Se congela en vez de calcularse en cada consulta, con el mismo criterio del
 * informe de evaluación (EFDS-1158): el informe dice lo que era cierto ese día.
 * Si entra un pago rezagado, el informe no cambia solo — se anula y se elabora
 * otro, y las dos versiones quedan.
 */
export interface BalanceEjecucion {
  /** Valor del contrato al momento de elaborar. */
  valorContrato: number;
  /** Lo efectivamente tramitado, que no siempre es lo cobrado. */
  valorPagado: number;
  saldo: number;
  /** Cuentas tramitadas y cuentas que quedaron sin tramitar. */
  cuentasTramitadas: number;
  cuentasPendientes: number;
  /** Desde cuándo corrió la ejecución, según el acta de inicio. */
  fechaInicio: string | null;
}

/**
 * Informe final de ejecución — actividad 10.1 (EFDS-1171, RF-LIQ-01).
 *
 * Lo elabora el supervisor con el consolidado de entregables, y es lo que
 * soporta la liquidación del contrato (EFDS-1172).
 */
@Entity('informes_finales', { schema: 'hiring' })
export class InformeFinal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  /** El informe firmado. Sin él hay un balance, no un informe. */
  @Column({ name: 'informe_documento_id' })
  informeDocumentoId: string;

  @Column({ name: 'fecha_elaboracion', type: 'date' })
  fechaElaboracion: string;

  /**
   * Lo que el supervisor concluye sobre la ejecución.
   *
   * Va aparte del documento porque es lo que la liquidación lee sin abrir el
   * archivo.
   */
  @Column({ type: 'text' })
  conclusion: string;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  balance: BalanceEjecucion;

  @Column({ length: 20, default: 'VIGENTE' })
  estado: EstadoInformeFinal;

  @Column({ name: 'elaborado_por', length: 200, nullable: true })
  elaboradoPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'anulado_at', type: 'timestamptz', nullable: true })
  anuladoAt: Date | null;

  @Column({ name: 'anulado_por', length: 200, nullable: true })
  anuladoPor: string | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;
}

/**
 * Un entregable del consolidado que pide el criterio de la historia.
 *
 * Entidad propia y no una lista dentro del balance: se van sumando de a uno
 * mientras se arma el informe, y cada uno puede traer su propio soporte.
 */
@Entity('entregables_informe', { schema: 'hiring' })
export class EntregableInforme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'informe_id' })
  informeId: string;

  @Column({ length: 500 })
  descripcion: string;

  /**
   * Cuándo se recibió.
   *
   * Nula cuando el entregable se pactó y no se cumplió: el informe final
   * también sirve para decir qué faltó.
   */
  @Column({ name: 'fecha_entrega', type: 'date', nullable: true })
  fechaEntrega: string | null;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  /** Opcional: muchos entregables ya están en el expediente por otra actividad. */
  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

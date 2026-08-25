import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Actividad 10.2 de la matriz: la liquidación del contrato. */
export const NUMERAL_LIQUIDACION = '10.2';

/**
 * Las dos figuras de la liquidación.
 *
 * No es un detalle del acta: son dos cosas distintas. La bilateral la firman
 * las dos partes de común acuerdo; la unilateral es un acto de la entidad, y
 * solo existe cuando el plazo del acuerdo ya venció.
 */
export type TipoLiquidacion = 'BILATERAL' | 'UNILATERAL';

/**
 * En qué punto del plazo legal está el contrato.
 *
 * `BILATERAL` mientras corren los cuatro meses del acuerdo; `UNILATERAL` en los
 * dos adicionales, donde la entidad ya puede liquidar sola; `VENCIDO` después,
 * cuando la potestad de liquidar de plano se agotó.
 */
export type MomentoDelPlazo = 'BILATERAL' | 'UNILATERAL' | 'VENCIDO';

export type EstadoLiquidacion = 'VIGENTE' | 'ANULADO';

/**
 * El balance financiero con el que se liquida.
 *
 * Congelado en el acta, con el criterio del informe final (EFDS-1171): el acta
 * dice lo que era cierto el día en que se firmó.
 */
export interface BalanceLiquidacion {
  valorContrato: number;
  valorPagado: number;
  /** Positivo: quedó plata sin ejecutar. Negativo: se pagó de más. */
  saldo: number;
  cuentasTramitadas: number;
  cuentasPendientes: number;
}

/**
 * Acta de liquidación — actividad 10.2 (EFDS-1172, RF-LIQ-02).
 *
 * Con el informe final a la vista, las partes liquidan de común acuerdo dentro
 * de los cuatro meses siguientes a la terminación. Si no lo logran, la entidad
 * puede liquidar unilateralmente en los dos meses adicionales.
 */
@Entity('actas_liquidacion', { schema: 'hiring' })
export class ActaLiquidacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  @Column({ length: 20 })
  tipo: TipoLiquidacion;

  /** El acta o la resolución firmada, según el tipo. */
  @Column({ name: 'acta_documento_id' })
  actaDocumentoId: string;

  @Column({ name: 'fecha_acta', type: 'date' })
  fechaActa: string;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  balance: BalanceLiquidacion;

  @Column({ name: 'paz_y_salvo', type: 'boolean', default: false })
  pazYSalvo: boolean;

  /**
   * El soporte del paz y salvo.
   *
   * Aparte del acta porque suele ser un documento propio del contratista, no
   * una hoja del acta. La base exige que exista si el paz y salvo se declara.
   */
  @Column({ name: 'paz_y_salvo_documento_id', type: 'uuid', nullable: true })
  pazYSalvoDocumentoId: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  /**
   * La ventana con la que se liquidó.
   *
   * Se guarda además de poder calcularse: es la que estaba vigente ese día. Si
   * cambia la norma o se corrige la fecha de terminación, el acta tiene que
   * seguir explicando por qué se liquidó cuando se liquidó.
   */
  @Column({ name: 'fecha_terminacion', type: 'date', nullable: true })
  fechaTerminacion: string | null;

  @Column({ name: 'bilateral_hasta', type: 'date', nullable: true })
  bilateralHasta: string | null;

  @Column({ name: 'unilateral_hasta', type: 'date', nullable: true })
  unilateralHasta: string | null;

  /** Resuelto y no derivado: explica que una liquidación tardía se aceptara. */
  @Column({ name: 'momento_del_plazo', length: 20, nullable: true })
  momentoDelPlazo: MomentoDelPlazo | null;

  @Column({ length: 20, default: 'VIGENTE' })
  estado: EstadoLiquidacion;

  @Column({ name: 'liquidado_por', length: 200, nullable: true })
  liquidadoPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'anulado_at', type: 'timestamptz', nullable: true })
  anuladoAt: Date | null;

  @Column({ name: 'anulado_por', length: 200, nullable: true })
  anuladoPor: string | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;
}

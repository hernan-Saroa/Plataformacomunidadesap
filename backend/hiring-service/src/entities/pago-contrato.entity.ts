import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/** Actividad 9.4 de la matriz: el trámite de pagos. */
export const NUMERAL_PAGOS = '9.4';

/**
 * El ciclo de la cuenta de cobro.
 *
 * `RADICADO` → `AVALADO` → `TRAMITADO` es el camino de la historia. `DEVUELTO`
 * es la salida del aval: el supervisor encontró algo que corregir y el cobro
 * vuelve al contratista sin borrarse, porque el periodo y los documentos que
 * presentó existieron.
 *
 * `ANULADO` es para el cobro que no debió radicarse. No se borra por lo mismo
 * que el resto del módulo: el expediente tiene que explicar los saltos en el
 * consecutivo.
 */
export type EstadoPago = 'RADICADO' | 'AVALADO' | 'DEVUELTO' | 'TRAMITADO' | 'ANULADO';

/**
 * Cuenta de cobro del contrato — actividad 9.4 (EFDS-1170, RF-EJE-04).
 *
 * En ejecución el contrato, el contratista presenta factura e informe de
 * actividades, el supervisor avala y la Dirección Financiera tramita el pago.
 *
 * La plataforma no paga: registra que se tramitó y con qué referencia. El giro
 * ocurre en el sistema financiero de la entidad, como la publicación ocurre en
 * SECOP.
 */
@Entity('pagos_contrato', { schema: 'hiring' })
@Unique('uq_pago_numero', ['contratoId', 'numero'])
export class PagoContrato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  /** Consecutivo dentro del contrato: «el pago 3». Lo lleva el servicio. */
  @Column({ type: 'int' })
  numero: number;

  /**
   * Periodo que se cobra.
   *
   * Rango y no un mes suelto: los contratos de obra cobran por avance y los de
   * prestación por periodo.
   */
  @Column({ name: 'periodo_desde', type: 'date' })
  periodoDesde: string;

  @Column({ name: 'periodo_hasta', type: 'date' })
  periodoHasta: string;

  /** `numeric` llega como string del driver; el transformer lo vuelve número. */
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

  /** La prestación y su prueba. Sin las dos no hay cuenta de cobro que avalar. */
  @Column({ name: 'factura_documento_id' })
  facturaDocumentoId: string;

  @Column({ name: 'informe_documento_id' })
  informeDocumentoId: string;

  @Column({ length: 20, default: 'RADICADO' })
  estado: EstadoPago;

  @Column({ name: 'radicado_at', type: 'timestamptz', default: () => 'now()' })
  radicadoAt: Date;

  @Column({ name: 'radicado_por', length: 200, nullable: true })
  radicadoPor: string | null;

  /**
   * Quién avaló, no solo que se avaló.
   *
   * Es la responsabilidad del supervisor la que respalda el pago, y el
   * expediente tiene que poder nombrarla.
   */
  @Column({ name: 'avalado_at', type: 'timestamptz', nullable: true })
  avaladoAt: Date | null;

  @Column({ name: 'avalado_por', length: 200, nullable: true })
  avaladoPor: string | null;

  @Column({ name: 'observacion_aval', type: 'text', nullable: true })
  observacionAval: string | null;

  @Column({ name: 'devuelto_at', type: 'timestamptz', nullable: true })
  devueltoAt: Date | null;

  @Column({ name: 'devuelto_por', length: 200, nullable: true })
  devueltoPor: string | null;

  @Column({ name: 'motivo_devolucion', type: 'text', nullable: true })
  motivoDevolucion: string | null;

  @Column({ name: 'tramitado_at', type: 'timestamptz', nullable: true })
  tramitadoAt: Date | null;

  @Column({ name: 'tramitado_por', length: 200, nullable: true })
  tramitadoPor: string | null;

  /** Con qué referencia lo tramitó Financiera: es cómo se encuentra fuera. */
  @Column({ name: 'referencia_pago', length: 120, nullable: true })
  referenciaPago: string | null;

  @Column({ name: 'anulado_at', type: 'timestamptz', nullable: true })
  anuladoAt: Date | null;

  @Column({ name: 'anulado_por', length: 200, nullable: true })
  anuladoPor: string | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

/**
 * Qué acompaña a la cuenta de cobro.
 *
 * Los dos primeros son los que la integración con Click evitaría pedir. Sin
 * ella se piden, y quedan registrados como lo que son: la carga triple que la
 * historia quería quitar.
 */
export type TipoSoportePago =
  | 'SEGURIDAD_SOCIAL'
  | 'RUT'
  | 'CERTIFICACION_BANCARIA'
  | 'OTRO';

/**
 * Documento que acompaña la cuenta de cobro.
 *
 * Entidad aparte y no columnas del pago porque llegan de a uno y su lista
 * cambia: un contratista persona natural trae seguridad social, uno jurídico
 * no, y siempre aparece un anexo que nadie previó. Con columnas fijas cada
 * documento nuevo sería una migración.
 */
@Entity('soportes_pago', { schema: 'hiring' })
export class SoportePago {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pago_id' })
  pagoId: string;

  @Column({ name: 'documento_id' })
  documentoId: string;

  @Column({ length: 30 })
  tipo: TipoSoportePago;

  @Column({ length: 300, nullable: true })
  descripcion: string | null;

  @Column({ name: 'cargado_por', length: 200, nullable: true })
  cargadoPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

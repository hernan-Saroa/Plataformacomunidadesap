import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** `numeric` llega como string desde el driver; se devuelve como número. */
const aNumero = {
  to: (valor: number | null) => valor,
  from: (valor: string | null) => (valor === null ? null : Number(valor)),
};

/**
 * Decisión de limitar o no la convocatoria a MIPYME (EFDS-1151).
 *
 * El sistema calcula si se cumplen las condiciones; la entidad decide. Por eso
 * se guardan las dos cosas: lo que arrojó el cálculo y lo que se resolvió. Que
 * discrepen es legítimo, pero exige motivarlo.
 */
@Entity('limitaciones_mipyme', { schema: 'hiring' })
export class LimitacionMipyme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  /** Lo que la entidad resolvió. */
  @Column({ type: 'boolean' })
  limitado: boolean;

  /** Lo que arrojó el cálculo cuando se decidió. */
  @Column({ name: 'condiciones_cumplidas', type: 'boolean' })
  condicionesCumplidas: boolean;

  // Todo lo que entró en el cálculo queda congelado: si mañana se corrigen los
  // parámetros, esta decisión debe seguir explicándose con los que regían.

  @Column({ name: 'manifestaciones_contadas', type: 'int' })
  manifestacionesContadas: number;

  @Column({
    name: 'valor_proceso',
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: aNumero,
  })
  valorProceso: number | null;

  @Column({
    name: 'tope_valor_aplicado',
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: aNumero,
  })
  topeValorAplicado: number | null;

  @Column({ name: 'unidad_tope_aplicada', length: 10, nullable: true })
  unidadTopeAplicada: string | null;

  /**
   * Salario con el que se convirtió el tope a pesos.
   *
   * Sin él, corregir el salario del año en la pantalla de Umbrales dejaría esta
   * decisión sin forma de reconstruir contra cuántos pesos se comparó. Null si
   * el tope se aplicó en pesos —el salario no entró en el cálculo— o si la
   * decisión es anterior a la migración 018.
   */
  @Column({
    name: 'smmlv_aplicado',
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: aNumero,
  })
  smmlvAplicado: number | null;

  @Column({ name: 'minimo_manifestaciones', type: 'int', nullable: true })
  minimoManifestaciones: number | null;

  /** Obligatorio cuando la decisión se aparta del cálculo. */
  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  /** Acto administrativo que sustenta la decisión. */
  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId: string | null;

  @Column({ name: 'decidido_por', length: 160, nullable: true })
  decididoPor: string | null;

  @Column({ name: 'decidido_at', type: 'timestamptz', default: () => 'now()' })
  decididoAt: Date;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

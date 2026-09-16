import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Qué clase de soporte acredita la ejecución.
 *
 * INFORME y ACTA son los que nombra la historia. SOPORTE recoge el resto —una
 * certificación, una comunicación— sin obligar a inventar una categoría cada
 * vez que aparece un documento nuevo.
 */
export type TipoSeguimiento = 'INFORME' | 'ACTA' | 'SOPORTE';

/**
 * Soporte del seguimiento a la ejecución (EFDS-1168, actividad 9.2).
 *
 * Se modela aparte de los documentos del expediente porque el seguimiento
 * tiene forma propia: cada soporte cubre un periodo y es de un tipo. Como pila
 * de adjuntos no se podría ver si falta el informe de un mes ni desde cuándo
 * no se reporta nada.
 */
@Entity('seguimientos_contrato', { schema: 'hiring' })
export class SeguimientoContrato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  @Column({ length: 20 })
  tipo: TipoSeguimiento;

  /** Qué acredita: un archivo sin explicación obliga a abrirlo para saberlo. */
  @Column({ type: 'text' })
  descripcion: string;

  /** Qué lapso cubre. Nulo cuando el soporte es de un hecho puntual. */
  @Column({ name: 'periodo_desde', type: 'date', nullable: true })
  periodoDesde: string | null;

  @Column({ name: 'periodo_hasta', type: 'date', nullable: true })
  periodoHasta: string | null;

  /**
   * La del soporte, no la del registro: un informe de enero se puede cargar en
   * febrero y sigue siendo de enero.
   */
  @Column({ name: 'fecha_soporte', type: 'date' })
  fechaSoporte: string;

  /** Sin archivo no hay soporte, solo la afirmación de que existe. */
  @Column({ name: 'documento_id' })
  documentoId: string;

  @Column({ name: 'registrado_por', length: 200, nullable: true })
  registradoPor: string | null;

  /**
   * Qué supervisión lo respaldaba al cargarlo.
   *
   * El supervisor de entonces puede no ser el de ahora, y el expediente tiene
   * que decir quién respondía ese día.
   */
  @Column({ name: 'supervision_id', type: 'uuid', nullable: true })
  supervisionId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

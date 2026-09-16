import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Los amparos que extienden la responsabilidad más allá de la ejecución.
 *
 * Son los que RF-LIQ-05 llama «estabilidad/calidad»: los demás —cumplimiento,
 * anticipo, salarios, responsabilidad civil— se agotan con el contrato, así que
 * no tiene sentido esperarlos para cerrarlo en firme.
 */
export const AMPAROS_DE_ESTABILIDAD = [
  'ESTABILIDAD_OBRA',
  'CALIDAD_SERVICIO',
  'CALIDAD_BIENES',
] as const;

export type EstadoCierreContrato = 'VIGENTE' | 'REVERTIDO';

/** Un amparo tal como estaba el día del cierre. */
export interface AmparoVerificado {
  tipo: string;
  nombre: string;
  numeroPoliza: string;
  vigenciaHasta: string;
  vencido: boolean;
}

/**
 * Cierre definitivo del contrato (EFDS-1175, RF-LIQ-05 y RF-SIS-01).
 *
 * Liquidado el contrato, cuando vencen los amparos de estabilidad y calidad ya
 * no queda nada que reclamar y la entidad lo cierra en firme.
 *
 * **Sin numeral propio**: la matriz le da cuatro actividades a la etapa 10 y las
 * cuatro están tomadas. Llega por su cuenta y no marca el riel, como la
 * declaratoria desierta (EFDS-1160).
 */
@Entity('cierres_contrato', { schema: 'hiring' })
export class CierreContrato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  @Column({ name: 'fecha_cierre', type: 'date' })
  fechaCierre: string;

  /** Los amparos que se miraron, congelados: el cierre explica su propia fecha. */
  @Column({ name: 'amparos_verificados', type: 'jsonb', default: () => "'[]'::jsonb" })
  amparosVerificados: AmparoVerificado[];

  /**
   * Cuándo venció el último amparo de estabilidad o calidad.
   *
   * Nulo cuando no había ninguno —el caso corriente de los contratos de
   * servicios profesionales—: no significa que falte el dato sino que no había
   * nada que esperar.
   */
  @Column({ name: 'ultimo_vencimiento', type: 'date', nullable: true })
  ultimoVencimiento: string | null;

  @Column({ name: 'soporte_documento_id', type: 'uuid', nullable: true })
  soporteDocumentoId: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ length: 20, default: 'VIGENTE' })
  estado: EstadoCierreContrato;

  @Column({ name: 'cerrado_por', length: 200, nullable: true })
  cerradoPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'revertido_at', type: 'timestamptz', nullable: true })
  revertidoAt: Date | null;

  @Column({ name: 'revertido_por', length: 200, nullable: true })
  revertidoPor: string | null;

  @Column({ name: 'motivo_reversion', type: 'text', nullable: true })
  motivoReversion: string | null;
}

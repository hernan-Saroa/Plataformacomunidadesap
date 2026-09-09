import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Tipologías de contrato y el formato del SIG que sirve de minuta (EFDS-1161).
 *
 * `numeralFormato` apunta a la biblioteca de formatos (EFDS-1419) en lugar de
 * guardar una ruta propia: abrir un segundo repositorio de plantillas dejaría
 * dos sitios donde actualizar el mismo formato.
 */
@Entity('tipologias_contrato', { schema: 'hiring' })
export class TipologiaContrato {
  @PrimaryColumn({ length: 60 })
  codigo: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  /** Numeral de la matriz cuyo formato del SIG hace de minuta. */
  @Column({ name: 'numeral_formato', length: 20, default: '8.1' })
  numeralFormato: string;

  /** Si la tipología exige garantías. Lo consume la legalización (EFDS-1164). */
  @Column({ name: 'exige_garantias', default: true })
  exigeGarantias: boolean;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'int', default: 100 })
  orden: number;
}

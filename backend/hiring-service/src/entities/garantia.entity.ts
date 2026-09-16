import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Cargada, aprobada y rechazada.
 *
 * La revisión es lo que pide el criterio 1 de EFDS-1164: el contratista carga y
 * la entidad aprueba o devuelve. Una póliza cargada todavía no cubre nada a
 * efectos del expediente; solo la aprobada legaliza.
 */
export type EstadoGarantia = 'CARGADA' | 'APROBADA' | 'RECHAZADA';

@Entity('garantias', { schema: 'hiring' })
export class Garantia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contrato_id' })
  contratoId: string;

  @Column({ length: 200 })
  aseguradora: string;

  @Column({ name: 'numero_poliza', length: 80 })
  numeroPoliza: string;

  /** La póliza como documento; aprobar sin verla no tendría sentido. */
  @Column({ name: 'documento_id' })
  documentoId: string;

  @Column({ length: 20, default: 'CARGADA' })
  estado: EstadoGarantia;

  @Column({ name: 'cargada_por', length: 200, nullable: true })
  cargadaPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'revisada_por', length: 200, nullable: true })
  revisadaPor: string | null;

  @Column({ name: 'revisada_at', type: 'timestamptz', nullable: true })
  revisadaAt: Date | null;

  @Column({ name: 'motivo_rechazo', type: 'text', nullable: true })
  motivoRechazo: string | null;
}

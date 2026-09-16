import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Cobertura de una garantía, con su propia vigencia.
 *
 * El desglose lo pide la matriz en 8.4: «desglosar los amparos para el control
 * de las fechas de vencimiento». No todos vencen a la vez —la estabilidad de la
 * obra se extiende años después de recibida, el anticipo se libera al
 * amortizarlo—, así que una póliza con una sola fecha no permitiría avisar del
 * que vence primero.
 */
@Entity('amparos', { schema: 'hiring' })
export class Amparo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'garantia_id' })
  garantiaId: string;

  @Column({ length: 60 })
  tipo: string;

  @Column({
    name: 'valor_asegurado',
    type: 'numeric',
    precision: 18,
    scale: 2,
    transformer: {
      to: (valor: number) => valor,
      from: (valor: string | null) => (valor === null ? null : Number(valor)),
    },
  })
  valorAsegurado: number;

  @Column({ name: 'vigencia_desde', type: 'date' })
  vigenciaDesde: string;

  @Column({ name: 'vigencia_hasta', type: 'date' })
  vigenciaHasta: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

/** Catálogo de coberturas que una garantía puede incluir. */
@Entity('tipos_amparo', { schema: 'hiring' })
export class TipoAmparo {
  @PrimaryColumn({ length: 60 })
  codigo: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'int', default: 100 })
  orden: number;
}

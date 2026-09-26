import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidad que representa los valores a reconocer máximos por trayecto
 * para desplazamientos a terminales aéreos (aeropuertos).
 * Corresponde a la tabla travel_expenses.tarifas_transporte_terminal.
 */
@Entity({ schema: 'travel_expenses', name: 'tarifas_transporte_terminal' })
@Index('idx_tarifas_transporte_terminal_departamento', ['departamento'])
@Index('idx_tarifas_transporte_terminal_depto_id', ['departamentoId'])
export class TarifaTransporteTerminalEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'departamento', type: 'varchar', length: 100, default: '' })
  departamento: string;

  @Column({ name: 'departamento_id', type: 'integer', nullable: true })
  departamentoId: number | null;

  @Column({ name: 'ciudad', type: 'varchar', length: 100, nullable: true })
  ciudad: string;

  @Column({ name: 'ciudad_aeropuerto', type: 'varchar', length: 150 })
  ciudadAeropuerto: string;

  @Column({
    name: 'valor_maximo',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  valorMaximo: number;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entidad que almacena los días festivos nacionales oficiales de Colombia.
 * Utilizada para el cómputo de días hábiles previos en la Etapa 7 (RF-PRE-003).
 *
 * Tabla física: travel_expenses.festivos_colombia
 */
@Entity({ name: 'festivos_colombia', schema: 'travel_expenses' })
@Index('idx_festivos_fecha', ['fecha'])
export class FestivoColombiaEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'fecha', type: 'date', unique: true })
  fecha: string;

  @Column({ name: 'descripcion', type: 'varchar', length: 150 })
  descripcion: string;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  creadoEn: Date;
}

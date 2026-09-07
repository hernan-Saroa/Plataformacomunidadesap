import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'travel_expenses', name: 'liquidation_params' })
export class LiquidationParamEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'clave', type: 'varchar', length: 50, unique: true })
  clave: string;

  @Column({ name: 'valor', type: 'varchar', length: 255 })
  valor: string;

  @Column({ name: 'tipo', type: 'varchar', length: 20, default: 'STRING' })
  tipo: string;

  @Column({ name: 'descripcion', type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}

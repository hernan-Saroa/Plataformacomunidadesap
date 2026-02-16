import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('plantilla_informe_ley', { schema: 'control_interno' })
@Index(['codigo'], { unique: true })
@Index(['activa'])
export class PlantillaInformeLey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  codigo: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'tipo_formato',
    nullable: false,
  })
  tipoFormato: 'PDF' | 'Word' | 'Excel' | 'HTML';

  @Column({ type: 'varchar', length: 500, name: 'ruta_plantilla', nullable: false })
  rutaPlantilla: string;

  @Column({ type: 'jsonb', name: 'variables_disponibles', default: [] })
  variablesDisponibles: string[];

  @Column({ type: 'jsonb', name: 'estructura_datos', default: {} })
  estructuraDatos: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ type: 'varchar', length: 50, default: '1.0' })
  version: string;

  @Column({ type: 'varchar', length: 255, name: 'creado_por', nullable: true })
  creadoPor?: string;

  @Column({ type: 'varchar', length: 255, name: 'actualizado_por', nullable: true })
  actualizadoPor?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

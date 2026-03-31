import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('actas_configuration', { schema: 'internal_disciplinary_control' })
export class ActaConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  tipo: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'varchar', length: 50, default: 'activo' })
  estado: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  codigo: string | null;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'text', nullable: true })
  plantilla: string;

  // Nuevos campos para información de la plantilla
  @Column({ type: 'varchar', length: 255, nullable: true })
  nombre_plantilla: string | null;

  @Column({ type: 'text', nullable: true })
  descripcion_plantilla: string | null;

  @Column({ type: 'varchar', length: 50, default: '1.0' })
  version_plantilla: string;

  @Column({ type: 'varchar', length: 50, default: 'activo' })
  estado_plantilla: string;

  // Campo para la etapa del proceso asociada
  @Column({ type: 'varchar', length: 50, nullable: true })
  stage: string | null;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;
}

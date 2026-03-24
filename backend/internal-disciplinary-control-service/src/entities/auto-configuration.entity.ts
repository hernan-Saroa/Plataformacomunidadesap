import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('autos_configuration')
export class AutoConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  tipo: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'varchar', length: 50, default: 'activo' })
  estado: string;

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

  @Column({ type: 'varchar', length: 50, nullable: true })
  stage: string | null;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { DireccionTerritorialEntity } from './direccion-territorial.entity';

@Entity({ schema: 'academic_work_plan', name: 'cetap' })
export class CetapEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ name: 'nombre_normalizado', type: 'varchar', length: 100 })
  nombreNormalizado: string;

  @Column({ name: 'id_direccion_territorial', type: 'bigint' })
  idDireccionTerritorial: string;

  @ManyToOne(() => DireccionTerritorialEntity, { nullable: false })
  @JoinColumn({ name: 'id_direccion_territorial' })
  direccionTerritorial: DireccionTerritorialEntity;

  @Column({ type: 'varchar', length: 20, default: 'cetap' })
  tipo: string; // 'sede_central' | 'cetap' | 'otro'

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitud: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitud: number | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: string | null;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: string | null;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'bigint', nullable: true })
  deletedBy: string | null;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}

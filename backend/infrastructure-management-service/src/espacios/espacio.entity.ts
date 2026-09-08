import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BloqueEdificio } from '../sedes/bloque.entity.js';

@Entity({ name: 'espacio_fisico', schema: 'infrastructure-management' })
export class EspacioFisico {
  @PrimaryGeneratedColumn('uuid', { name: 'id_espacio' })
  idEspacio: string;

  @Column({ type: 'uuid', name: 'id_bloque' })
  idBloque: string;

  @Column({ type: 'varchar', length: 50 })
  codigo: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 50 })
  tipo: string; // AULA, AUDITORIO, LABORATORIO, OFICINA, BIBLIOTECA, SALA_CONSEJO

  @Column({ type: 'int', default: 30 })
  capacidad: number;

  @Column({ type: 'int', default: 1 })
  piso: number;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true, name: 'area_m2' })
  areaM2: number;

  @Column({ type: 'boolean', default: false, name: 'tiene_aire_acondicionado' })
  tieneAireAcondicionado: boolean;

  @Column({ type: 'boolean', default: false, name: 'tiene_videobeam' })
  tieneVideobeam: boolean;

  @Column({ type: 'boolean', default: false, name: 'tiene_computadores' })
  tieneComputadores: boolean;

  @Column({ type: 'varchar', length: 30, default: 'DISPONIBLE' })
  estado: string; // DISPONIBLE, MANTENIMIENTO, INACTIVO, RESERVADO

  @Column({ type: 'boolean', default: true, name: 'is_activo' })
  isActivo: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => BloqueEdificio, (bloque) => bloque.espacios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_bloque' })
  bloque: BloqueEdificio;
}

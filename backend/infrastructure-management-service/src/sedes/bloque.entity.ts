import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Sede } from './sede.entity.js';
import { EspacioFisico } from '../espacios/espacio.entity.js';

@Entity({ name: 'bloque_edificio', schema: 'infrastructure-management' })
export class BloqueEdificio {
  @PrimaryGeneratedColumn('uuid', { name: 'id_bloque' })
  idBloque: string;

  @Column({ type: 'uuid', name: 'id_sede' })
  idSede: string;

  @Column({ type: 'varchar', length: 30 })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'int', default: 1 })
  pisos: number;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'boolean', default: true, name: 'is_activo' })
  isActivo: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Sede, (sede) => sede.bloques, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sede' })
  sede: Sede;

  @OneToMany(() => EspacioFisico, (espacio) => espacio.bloque)
  espacios: EspacioFisico[];
}

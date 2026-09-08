import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BloqueEdificio } from './bloque.entity.js';

@Entity({ name: 'sede', schema: 'infrastructure-management' })
export class Sede {
  @PrimaryGeneratedColumn('uuid', { name: 'id_sede' })
  idSede: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 50, default: 'TERRITORIAL' })
  tipo: string;

  @Column({ type: 'varchar', length: 100 })
  departamento: string;

  @Column({ type: 'varchar', length: 100 })
  municipio: string;

  @Column({ type: 'varchar', length: 255 })
  direccion: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'email_contacto' })
  emailContacto: string;

  @Column({ type: 'boolean', default: true, name: 'is_activo' })
  isActivo: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => BloqueEdificio, (bloque) => bloque.sede)
  bloques: BloqueEdificio[];
}

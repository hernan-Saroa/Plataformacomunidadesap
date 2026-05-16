import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Person } from '../users/person.entity';

@Entity('carpeta_digital')
export class CarpetaDigital {
  @PrimaryGeneratedColumn('uuid', { name: 'id_carpeta_digital' })
  id: string;

  @Column({ name: 'persona_id', type: 'uuid', unique: true })
  personaId: string;

  @ManyToOne(() => Person, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'persona_id', referencedColumnName: 'id' })
  persona: Person;

  @Column({ name: 'nombre_carpeta', type: 'varchar', length: 255, nullable: true })
  nombreCarpeta: string | null;

  @Column({ name: 'estado', type: 'varchar', length: 30, default: 'ACTIVO' })
  estado: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

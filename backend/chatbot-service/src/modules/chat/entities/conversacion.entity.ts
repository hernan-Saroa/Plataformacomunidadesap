import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Mensaje } from './mensaje.entity';

@Entity({ name: 'conversacion', schema: 'chatbot' })
export class Conversacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'usuario_id' })
  usuarioId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'usuario_email' })
  usuarioEmail?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'usuario_nombre' })
  usuarioNombre?: string;

  @Column({ type: 'varchar', length: 255, default: 'Nueva conversación' })
  titulo: string;

  @Column({ type: 'varchar', length: 100, default: 'general' })
  contexto: string;

  @Column({ type: 'jsonb', default: {} })
  metadatos: Record<string, any>;

  @Column({ type: 'boolean', default: true, name: 'is_activo' })
  isActivo: boolean;

  @OneToMany(() => Mensaje, (mensaje) => mensaje.conversacion, { cascade: true })
  mensajes: Mensaje[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

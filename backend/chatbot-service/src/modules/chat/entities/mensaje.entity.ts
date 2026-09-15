import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversacion } from './conversacion.entity';

@Entity({ name: 'mensaje', schema: 'chatbot' })
export class Mensaje {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'conversacion_id' })
  conversacionId: string;

  @ManyToOne(() => Conversacion, (conversacion) => conversacion.mensajes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversacion_id' })
  conversacion: Conversacion;

  @Column({ type: 'varchar', length: 30 })
  rol: 'user' | 'assistant' | 'system';

  @Column({ type: 'text' })
  contenido: string;

  @Column({ type: 'int', default: 0 })
  tokens: number;

  @Column({ type: 'jsonb', default: {} })
  metadatos: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

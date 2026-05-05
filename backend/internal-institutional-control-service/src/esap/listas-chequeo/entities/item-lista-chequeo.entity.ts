import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ListaChequeo } from './lista-chequeo.entity';

@Entity('item_lista_chequeo', { schema: 'control_interno' })
@Index(['listaChequeoId', 'orden'])
export class ItemListaChequeo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lista_chequeo_id', type: 'uuid' })
  listaChequeoId: string;

  @ManyToOne(() => ListaChequeo, (lista) => lista.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lista_chequeo_id' })
  listaChequeo: ListaChequeo;

  @Column({ type: 'text' })
  texto: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  categoria?: string;

  @Column({ type: 'boolean', default: false })
  obligatorio: boolean;

  @Column({ type: 'integer', default: 0 })
  orden: number;

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPOS DE ESTADO DE COMPLETADO (para persistencia en Kanban)
  // ═══════════════════════════════════════════════════════════════════════════

  @Column({ type: 'boolean', default: false })
  completado: boolean;

  @Column({ name: 'fecha_completado', type: 'timestamp', nullable: true })
  fechaCompletado: Date | null;

  @Column({ name: 'completado_por', type: 'varchar', length: 255, nullable: true })
  completadoPor: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'documento_biblioteca_id', type: 'varchar', length: 255, nullable: true })
  documentoBibliotecaId: string | null;

  @Column({ name: 'documento_nombre', type: 'varchar', length: 500, nullable: true })
  documentoNombre: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

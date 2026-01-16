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

  @Column({ type: 'integer', nullable: false })
  numero: number;

  @Column({ type: 'text', nullable: false })
  pregunta: string;

  @Column({ type: 'text', nullable: false })
  criterio: string;

  @Column({ name: 'tipo_respuesta', type: 'varchar', length: 50, nullable: false })
  tipoRespuesta: string;

  @Column({ type: 'text' })
  texto: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  categoria?: string;

  @Column({ type: 'boolean', default: false })
  obligatorio: boolean;

  @Column({ type: 'integer', default: 0 })
  orden: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

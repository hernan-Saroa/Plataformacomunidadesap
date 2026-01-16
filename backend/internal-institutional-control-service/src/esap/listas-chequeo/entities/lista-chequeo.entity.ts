import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TipoAuditoria } from '../../tipos-auditoria/entities/tipo-auditoria.entity';
import { ItemListaChequeo } from './item-lista-chequeo.entity';

@Entity('lista_chequeo', { schema: 'control_interno' })
@Index(['codigo'], { unique: true })
@Index(['activa'])
@Index(['tipoAuditoriaId'])
@Index(['deletedAt'], { where: 'deleted_at IS NULL' })
export class ListaChequeo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  tipo: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  categoria: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  version: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  estado: string;

  @Column({ name: 'aplicable_para', type: 'jsonb', nullable: false })
  aplicablePara: any[];

  @Column({ name: 'created_by', type: 'varchar', length: 255, nullable: false })
  createdBy: string;

  @Column({ name: 'tipo_auditoria_id', type: 'uuid', nullable: true })
  tipoAuditoriaId?: string;

  @ManyToOne(() => TipoAuditoria, { nullable: true })
  @JoinColumn({ name: 'tipo_auditoria_id' })
  tipoAuditoria?: TipoAuditoria;

  @OneToMany(() => ItemListaChequeo, (item) => item.listaChequeo, {
    cascade: true,
    eager: false,
  })
  items: ItemListaChequeo[];

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({ name: 'usos_programados', type: 'integer', default: 0 })
  usosProgramados: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}

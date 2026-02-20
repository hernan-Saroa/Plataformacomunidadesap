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

// Enum para tipo de lista de chequeo
export enum TipoListaChequeo {
  PLANEACION = 'planeacion',
  EJECUCION = 'ejecucion',
  COMUNICACION = 'comunicacion',
}

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

  @Column({ type: 'varchar', length: 100, nullable: true })
  categoria?: string;

  @Column({
    type: 'enum',
    enum: TipoListaChequeo,
    enumName: 'tipo_lista_chequeo_enum',
    default: TipoListaChequeo.EJECUCION,
  })
  tipo: TipoListaChequeo;

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

  // ═══════════════════════════════════════════════════════════════════════════
  // VINCULACIÓN CON AUDITORÍA
  // ═══════════════════════════════════════════════════════════════════════════

  @Column({ name: 'auditoria_id', type: 'uuid', nullable: true })
  auditoriaId?: string;

  @Column({ name: 'nombre_auditoria', type: 'varchar', length: 500, nullable: true })
  nombreAuditoria?: string;

  @Column({ name: 'auditor_responsable', type: 'varchar', length: 255, nullable: true })
  auditorResponsable?: string;

  @Column({ name: 'fecha_aplicacion', type: 'date', nullable: true })
  fechaAplicacion?: Date;

  @Column({ name: 'fecha_diligenciamiento', type: 'date', nullable: true })
  fechaDiligenciamiento?: Date;

  @Column({ name: 'items_completados', type: 'integer', default: 0 })
  itemsCompletados: number;

  @Column({ name: 'cumplimiento', type: 'integer', default: 0 })
  cumplimiento: number;

  // ═══════════════════════════════════════════════════════════════════════════
  // FASES QUE IMPACTA LA LISTA
  // ═══════════════════════════════════════════════════════════════════════════

  @Column({ name: 'fase_planeacion', type: 'boolean', default: false })
  fasePlaneacion: boolean;

  @Column({ name: 'fase_ejecucion', type: 'boolean', default: false })
  faseEjecucion: boolean;

  @Column({ name: 'fase_comunicacion', type: 'boolean', default: false })
  faseComunicacion: boolean;

  @Column({ name: 'fase_seguimiento', type: 'boolean', default: false })
  faseSeguimiento: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}

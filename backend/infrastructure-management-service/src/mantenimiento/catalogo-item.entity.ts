import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'catalogo_item', schema: 'infrastructure-management' })
@Unique('uq_catalogo_item_codigo', ['catalogo', 'codigo'])
@Index('idx_catalogo_item_catalogo_activo', ['catalogo', 'isActivo'])
export class CatalogoItem {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id_catalogo' })
  idCatalogo: number;

  @Column({ type: 'varchar', length: 50 })
  catalogo: string;

  @Column({ type: 'varchar', length: 40 })
  codigo: string;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'boolean', name: 'is_activo', default: true })
  isActivo: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, any>;
}

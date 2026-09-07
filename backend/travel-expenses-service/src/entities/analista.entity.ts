import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Entidad que representa un analista del Grupo de Viáticos.
 * Relaciona la carga laboral/operativa con el usuario del sistema (auth.user).
 *
 * Tabla física: travel_expenses.analistas_viaticos
 */
@Entity({ name: 'analistas_viaticos', schema: 'travel_expenses' })
@Index('idx_analistas_viaticos_usuario_id', ['usuarioId'])
@Index('idx_analistas_viaticos_identificacion', ['identificacion'])
@Index('idx_analistas_viaticos_activo', ['activo'])
export class AnalistaEntity {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid', unique: true })
  usuarioId: string;

  @Column({ name: 'id_persona', type: 'uuid', nullable: true })
  idPersona: string | null;

  @Column({ name: 'identificacion', type: 'varchar', length: 50, unique: true, nullable: true })
  identificacion: string | null;

  @Column({ name: 'nombre_completo', type: 'varchar', length: 255 })
  nombreCompleto: string;

  @Column({ name: 'username', type: 'varchar', length: 100 })
  username: string;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'telefono', type: 'varchar', length: 50, nullable: true })
  telefono: string | null;

  @Column({ name: 'cargo', type: 'varchar', length: 255, nullable: true })
  cargo: string | null;

  @Column({ name: 'dependencia_id', type: 'bigint', nullable: true })
  dependenciaId: number | null;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Entidad de lectura que representa un usuario del esquema auth.
 * Se utiliza exclusivamente para la relación de asignación de analista
 * en solicitudes de comisión (RF-REC-002).
 *
 * Tabla física: auth."user"
 */
@Entity({ name: 'user', schema: 'auth' })
export class UsuarioEntity {
  @PrimaryColumn({ name: 'id_user', type: 'uuid' })
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ name: 'id_person', type: 'uuid', nullable: true })
  idPerson: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Entidad que mapea la tabla maestra auth.system_settings
 * para consumir parámetros globales centralizados, como el Salario Mínimo Legal Vigente (SMMLV).
 */
@Entity({ schema: 'auth', name: 'system_settings' })
export class AuthSystemSettingEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'text', default: '' })
  value: string;

  @Column({
    type: 'timestamp',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}

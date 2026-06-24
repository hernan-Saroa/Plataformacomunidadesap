import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Entidad clave-valor para configuraciones globales del sistema.
 * Se usa inicialmente para controlar si el login con correo+contraseña está habilitado.
 */
@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'text', default: '' })
  value: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updatedAt: Date;
}

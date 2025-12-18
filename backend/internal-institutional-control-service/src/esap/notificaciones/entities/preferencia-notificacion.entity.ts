import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('preferencia_notificacion', { schema: 'control_interno' })
@Index(['usuarioId'], { unique: true })
export class PreferenciaNotificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'varchar', length: 255, unique: true, nullable: false })
  usuarioId: string;

  @Column({ name: 'notificaciones_email', type: 'boolean', default: true })
  recibirEmail: boolean;

  @Column({ name: 'notificaciones_sistema', type: 'boolean', default: true })
  recibirSistema: boolean;

  @Column({ name: 'frecuencia_recordatorios', type: 'varchar', length: 50, default: '7' })
  diasAnticipacion: number;

  @Column({ name: 'tipos_notificacion', type: 'jsonb', nullable: true })
  tiposNotificacion?: {
    [key: string]: {
      email: boolean;
      sistema: boolean;
      activo: boolean;
    };
  };

  @Column({ name: 'horario_preferido', type: 'varchar', length: 50, nullable: true })
  horarioPreferido?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


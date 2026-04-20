import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('notificacion', { schema: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn('uuid', { name: 'id_notificacion' })
  id_notificacion: string;

  @Column({ name: 'id_usuario_destinatario' })
  id_usuario_destinatario: string;

  @Column({ name: 'tipo_notificacion' })
  tipo_notificacion: string;

  @Column()
  titulo: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ name: 'descripcion_corta', nullable: true })
  descripcion_corta: string;

  @Column({ nullable: true })
  icono: string;

  @Column({ nullable: true })
  color: string;

  @Column({ default: 'Media' })
  prioridad: string;

  @Column({ nullable: true })
  categoria: string;

  @Column({ default: false })
  leida: boolean;

  @Column({ default: false })
  archivada: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fecha_creacion: Date;

  @Column({ name: 'fecha_lectura', nullable: true, type: 'timestamptz' })
  fecha_lectura: Date;

  @Column({ name: 'fecha_archivado', nullable: true, type: 'timestamptz' })
  fecha_archivado: Date;

  @Column({ name: 'tiene_accion', default: false })
  tiene_accion: boolean;

  @Column({ name: 'texto_boton_accion', nullable: true })
  texto_boton_accion: string;

  @Column({ name: 'url_accion', nullable: true })
  url_accion: string;

  @Column({ name: 'datos_adicionales', type: 'jsonb', nullable: true })
  datos_adicionales: Record<string, any>;

  @Column({ name: 'email_enviado', default: false })
  email_enviado: boolean;

  @Column({ name: 'email_entregado', default: false })
  email_entregado: boolean;

  @Column({ name: 'email_abierto', default: false })
  email_abierto: boolean;

  @Column({ name: 'email_click', default: false })
  email_click: boolean;

  @Column({ name: 'fecha_envio_email', nullable: true, type: 'timestamptz' })
  fecha_envio_email: Date;

  @Column({ name: 'fecha_apertura_email', nullable: true, type: 'timestamptz' })
  fecha_apertura_email: Date;
}

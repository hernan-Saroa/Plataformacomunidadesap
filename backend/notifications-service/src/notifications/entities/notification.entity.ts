// Rebuild triggered after database truncation
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

  @Column({ name: 'id_usuario_destinatario', type: 'uuid', nullable: true })
  id_usuario_destinatario: string;

  @Column({ name: 'tipo_notificacion', length: 100, nullable: true })
  tipo_notificacion: string;

  @Column({ length: 255 })
  titulo: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ name: 'descripcion_corta', length: 255, nullable: true })
  descripcion_corta: string;

  @Column({ length: 100, nullable: true })
  icono: string;

  @Column({ length: 50, nullable: true })
  color: string;

  @Column({ length: 20, default: 'Media' })
  prioridad: string;

  @Column({ length: 100, nullable: true })
  categoria: string;

  @Column({ default: false })
  leida: boolean;

  @Column({ default: false })
  archivada: boolean;

  @Column({ name: 'es_favorito', default: false })
  es_favorito: boolean;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fecha_creacion: Date;

  @Column({ name: 'fecha_lectura', nullable: true, type: 'timestamptz' })
  fecha_lectura: Date;

  @Column({ name: 'fecha_archivado', nullable: true, type: 'timestamptz' })
  fecha_archivado: Date;

  @Column({ name: 'tiene_accion', default: false })
  tiene_accion: boolean;

  @Column({ name: 'texto_boton_accion', length: 100, nullable: true })
  texto_boton_accion: string;

  @Column({ name: 'url_accion', length: 500, nullable: true })
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

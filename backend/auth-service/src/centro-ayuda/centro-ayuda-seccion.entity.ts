import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Qué pide el formulario de un recurso y cómo se muestra en el Centro de Ayuda:
 * general (archivo, enlace o texto), manual (PDF con versión, uno vigente),
 * videos (archivo de video o enlace) y atajos (combinación de teclas).
 */
export const TIPOS_SECCION = ['general', 'manual', 'videos', 'atajos'] as const;
export type TipoSeccion = (typeof TIPOS_SECCION)[number];

/** Iconos de lucide que el front sabe dibujar (centro-ayuda/IconoSeccion.tsx). */
export const ICONOS_SECCION = [
  'Book',
  'BookOpen',
  'FileText',
  'Video',
  'Keyboard',
  'GraduationCap',
  'Lightbulb',
  'HelpCircle',
  'ClipboardList',
  'FolderOpen',
  'Megaphone',
  'Newspaper',
  'Rocket',
  'Settings',
  'ShieldCheck',
  'Users',
  'Wrench',
  'Link2',
] as const;
export type IconoSeccion = (typeof ICONOS_SECCION)[number];

@Entity({ name: 'centro_ayuda_seccion', schema: 'auth' })
export class CentroAyudaSeccion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 40, default: 'BookOpen' })
  icono: IconoSeccion;

  @Column({ type: 'varchar', length: 20, default: 'general' })
  tipo: TipoSeccion;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'creado_por', type: 'varchar', length: 150, nullable: true })
  creadoPor: string | null;

  @Column({ name: 'actualizado_por', type: 'varchar', length: 150, nullable: true })
  actualizadoPor: string | null;

  @Column({ name: 'eliminado_por', type: 'varchar', length: 150, nullable: true })
  eliminadoPor: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp with time zone' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamp with time zone' })
  actualizadoEn: Date;

  /** Borrado suave: con fecha, la sección está en la papelera. */
  @DeleteDateColumn({ name: 'eliminado_en', type: 'timestamp with time zone' })
  eliminadoEn: Date | null;
}

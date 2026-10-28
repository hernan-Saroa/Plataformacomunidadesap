import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CentroAyudaSeccion } from './centro-ayuda-seccion.entity';

@Entity({ name: 'centro_ayuda_recurso', schema: 'auth' })
export class CentroAyudaRecurso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'id_seccion', type: 'int' })
  idSeccion: number;

  @ManyToOne(() => CentroAyudaSeccion)
  @JoinColumn({ name: 'id_seccion' })
  seccion?: CentroAyudaSeccion;

  @Column({ type: 'varchar', length: 200 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  /** Módulo del sistema al que pertenece la guía; la sección agrupa por él. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  modulo: string | null;

  /** Texto libre; en los atajos es la combinación de teclas. */
  @Column({ type: 'text', nullable: true })
  contenido: string | null;

  @Column({ type: 'text', nullable: true })
  enlace: string | null;

  /** Versión del sistema a la que corresponde (manual de usuario). */
  @Column({ type: 'varchar', length: 30, nullable: true })
  version: string | null;

  @Column({ name: 'archivo_ruta', type: 'varchar', length: 255, nullable: true })
  archivoRuta: string | null;

  @Column({ name: 'archivo_nombre', type: 'varchar', length: 255, nullable: true })
  archivoNombre: string | null;

  @Column({ name: 'archivo_mime', type: 'varchar', length: 150, nullable: true })
  archivoMime: string | null;

  @Column({ name: 'archivo_tamano', type: 'bigint', nullable: true })
  archivoTamano: string | null;

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

  /** Borrado suave: con fecha, el recurso está en la papelera y conserva su archivo. */
  @DeleteDateColumn({ name: 'eliminado_en', type: 'timestamp with time zone' })
  eliminadoEn: Date | null;
}

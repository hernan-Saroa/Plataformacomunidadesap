import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Qué documentos exige una actividad, y a qué modalidades les exige cada uno.
 *
 * En tabla y no en el código porque la lista cambia con la normativa: hoy la
 * contratación directa produce un acto de justificación donde las competitivas
 * producen aviso y pliego, y esa correspondencia es justo lo que el Módulo de
 * Configuración de Etapas tendrá que dejar administrar (EFDS-1187).
 */
@Entity('documentos_requeridos', { schema: 'hiring' })
@Unique('uq_documento_requerido', ['numeral', 'codigo'])
export class DocumentoRequerido {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Actividad de la matriz que lo exige, p. ej. '5.1'. */
  @Column({ length: 20 })
  numeral: string;

  /** Identificador de negocio: AVISO_CONVOCATORIA, PROYECTO_PLIEGO… */
  @Column({ length: 60 })
  codigo: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  /** Códigos de modalidad a los que aplica; vacío = todas. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  modalidades: string[];

  @Column({ default: true })
  obligatorio: boolean;

  @Column({ default: 0 })
  orden: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

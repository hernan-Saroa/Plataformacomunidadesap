import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';

/**
 * BR-044 — Estado de aprobación por bloque de campos del RUND.
 * Cada docente tiene un registro por bloque (IDENTIDAD, FORMACION, VINCULACION, CONTACTO).
 * Flujo: Pendiente → En revisión → Aprobado | Devuelto | Soporte faltante
 */
@Entity({ schema: 'academic_work_plan', name: 'RundCampoEstado' })
export class RundCampoEstadoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'docente_id', type: 'uuid', nullable: true })
  docenteId: string | null;

  /**
   * Bloque de campos:
   * - IDENTIDAD: documento, tipo_doc, nombre, fecha_nacimiento, genero
   * - FORMACION: nivel, pregrado, especializacion, maestria, doctorado, posdoctorado
   * - VINCULACION: tipo, regimen, categoria, dedicacion, acto_administrativo, puntaje_salarial, etc.
   * - CONTACTO: correo_institucional, correo_alternativo, telefono
   */
  @Column({ name: 'bloque', type: 'text', nullable: true })
  bloque: string | null;

  /**
   * BR-044 — Estados: Pendiente | En revisión | Aprobado | Devuelto | Soporte faltante
   */
  @Column({ name: 'estado', type: 'text', default: 'Pendiente' })
  estado: string;

  /**
   * BR-043 — Segregación maker-checker: quién cargó los datos de este bloque.
   */
  @Column({ name: 'cargado_por', type: 'text', nullable: true })
  cargadoPor: string | null;

  /**
   * BR-043 — Segregación maker-checker: quién revisó/aprobó este bloque.
   * Debe ser distinto de cargadoPor.
   */
  @Column({ name: 'revisado_por', type: 'text', nullable: true })
  revisadoPor: string | null;

  /**
   * BR-045 — Observación obligatoria al devolver.
   */
  @Column({ name: 'observacion', type: 'text', nullable: true })
  observacion: string | null;

  /**
   * BR-046 — Versión del bloque (incrementa en cada cambio de dato aprobado).
   */
  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  /**
   * Canal de origen del último cambio: MASIVO | MODAL | AUTOGESTION
   */
  @Column({ name: 'canal_origen', type: 'text', nullable: true })
  canalOrigen: string | null;

  /**
   * IDs de soportes vinculados (referencias a Carpeta Digital).
   * BR-038 — Soporte obligatorio por campo crítico.
   */
  @Column({ name: 'soporte_ids', type: 'jsonb', nullable: true, default: '[]' })
  soporteIds: string[];

  /**
   * Fecha de la última revisión/aprobación.
   */
  @Column({ name: 'fecha_revision', type: 'timestamp', nullable: true })
  fechaRevision: Date | null;

  @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}

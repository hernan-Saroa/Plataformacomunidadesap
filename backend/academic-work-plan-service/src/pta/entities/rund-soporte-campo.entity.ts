import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, BeforeInsert } from 'typeorm';

/**
 * BR-038/BR-039/BR-041 — Enlace N:M entre soportes (Carpeta Digital) y bloques de campos RUND.
 * Un soporte puede cubrir múltiples bloques (BR-041 — soporte multicampo).
 * Cada bloque exige tipos de soporte específicos (BR-039 — catálogo soporte↔campo).
 */
@Entity({ schema: 'academic_work_plan', name: 'RundSoporteCampo' })
export class RundSoporteCampoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'docente_id', type: 'uuid', nullable: true })
  docenteId: string | null;

  /**
   * Bloque de campos al que aplica este soporte.
   * IDENTIDAD | FORMACION | VINCULACION | CONTACTO
   */
  @Column({ name: 'bloque', type: 'text', nullable: true })
  bloque: string | null;

  /**
   * BR-039 — Tipo de soporte según catálogo:
   * - IDENTIDAD: documento_identidad, cedula_extranjeria
   * - FORMACION: diploma_pregrado, acta_grado_pregrado, diploma_especializacion,
   *              diploma_maestria, diploma_doctorado, convalidacion_men
   * - VINCULACION: acto_administrativo, resolucion_nombramiento, contrato,
   *                evaluacion_desempeno, acto_puntaje
   * - CONTACTO: (no requiere soporte — campos no críticos)
   */
  @Column({ name: 'tipo_soporte', type: 'text', nullable: true })
  tipoSoporte: string | null;

  /**
   * BR-058 — Referencia al documento en Carpeta Digital (no duplicamos el archivo).
   * Puede ser el ID del tipo_documento o el ID del archivo en Carpeta Digital.
   */
  @Column({ name: 'documento_carpeta_id', type: 'text', nullable: true })
  documentoCarpetaId: string | null;

  /**
   * Nombre descriptivo del archivo para display.
   */
  @Column({ name: 'nombre_archivo', type: 'text', nullable: true })
  nombreArchivo: string | null;

  /**
   * Estado del soporte: Pendiente | Aprobado | Rechazado
   */
  @Column({ name: 'estado', type: 'text', default: 'Pendiente' })
  estado: string;

  /**
   * BR-055 — Fecha de vencimiento (solo para soportes con vigencia: certificaciones, evaluaciones).
   * null = sin caducidad (diplomas).
   */
  @Column({ name: 'fecha_vencimiento', type: 'timestamp', nullable: true })
  fechaVencimiento: Date | null;

  /**
   * Quién cargó el soporte.
   */
  @Column({ name: 'cargado_por', type: 'text', nullable: true })
  cargadoPor: string | null;

  /**
   * Observación del revisor (motivo de rechazo, etc.)
   */
  @Column({ name: 'observacion', type: 'text', nullable: true })
  observacion: string | null;

  @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @BeforeInsert()
  setTimestamps() {
    this.createdAt = new Date();
  }
}

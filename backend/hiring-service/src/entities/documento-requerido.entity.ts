import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

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

  /**
   * Tipologías contractuales a las que aplica; vacío = todas.
   *
   * Son los valores de `tipologia_contractual` de la 3.1, en texto, porque es
   * como el proceso la guarda (migración 085).
   */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  tipologias: string[];

  /**
   * Código del formato de la biblioteca que se descarga para diligenciarlo.
   *
   * Por código y no por id: la biblioteca versiona por (codigo, version), y el
   * requisito tiene que ofrecer la versión vigente sin reconfigurarse cada vez
   * que el SIG publica una nueva.
   */
  @Column({ name: 'plantilla_codigo', type: 'varchar', length: 40, nullable: true })
  plantillaCodigo: string | null;

  @Column({ default: true })
  obligatorio: boolean;

  @Column({ default: 0 })
  orden: number;

  @Column({ default: true })
  activo: boolean;

  /**
   * Si el requisito es cita del formato oficial o lectura del equipo.
   *
   * Misma marca que `actividades_con_soporte` lleva desde la 051: la lista de
   * chequeo de la etapa 3 se armó con el texto del procedimiento, no con el
   * formato del SIG, y quien vaya a validarla con la Dirección necesita saber
   * qué filas revisar.
   */
  @Column({ default: false })
  confirmado: boolean;

  /** De dónde sale el requisito, para poder contrastarlo. */
  @Column({ name: 'nota_fuente', type: 'text', nullable: true })
  notaFuente: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

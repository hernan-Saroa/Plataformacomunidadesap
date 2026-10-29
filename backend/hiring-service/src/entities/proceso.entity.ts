import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Expediente } from './expediente.entity';

/**
 * Cómo terminó el proceso de selección, o que todavía no ha terminado.
 *
 * La etapa 7 tiene dos desenlaces y ninguno es obligatorio: se adjudica
 * (EFDS-1159) o se declara desierto (EFDS-1160).
 *
 * `NEGADO` es un tercero y ocurre mucho antes (EFDS-1183): la Dirección revisa
 * lo que el área radicó y dice que la contratación no procede. No es
 * «desierto» —desierto es que el proceso salió al mercado y no hubo con quién
 * contratar—; aquí no llegó a salir.
 *
 * `CANCELADO` es el cuarto (migración 097): cambiaron las condiciones con las
 * que nació —la línea del PAA desapareció o cambió la vigencia— y quien revisa
 * el cambio decide que no puede seguir. No lo niega la Dirección ni sale
 * desierto: deja de tener sustento.
 */
export type EstadoProceso = 'EN_CURSO' | 'ADJUDICADO' | 'DESIERTO' | 'NEGADO' | 'CANCELADO';

/** Los estados en que el proceso todavía ocupa su línea del PAA. */
export const ESTADOS_VIVOS: readonly EstadoProceso[] = ['EN_CURSO', 'ADJUDICADO'];

@Entity('procesos', { schema: 'hiring' })
export class Proceso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 60, unique: true })
  radicado: string;

  /**
   * Consecutivo de Active Document con el que el área remitió el paquete a la
   * Dirección de Contratación (actividad 3.3).
   *
   * No es `radicado`: aquel es el consecutivo del módulo (PC-AAAA-NNNN) y este
   * el del aplicativo de gestión documental de la escuela. Sin él, el
   * expediente y Active Document no se pueden cruzar.
   *
   * Nulo cuando el paquete se remitió por una vía que no genera radicado: el
   * procedimiento admite el correo y la carpeta compartida.
   */
  @Column({ name: 'radicado_gestion_documental', length: 120, nullable: true })
  radicadoGestionDocumental: string | null;

  @Column({ type: 'text' })
  objeto: string;

  /**
   * Modalidad de selección; referencia a hiring.modalidades.
   *
   * Nullable solo por los procesos creados antes de exigirla: inventarles una
   * falsearía el expediente. Las creaciones nuevas la exigen en el DTO.
   */
  @Column({ length: 60, nullable: true })
  modalidad: string | null;

  /**
   * Causal que habilita contratar por esa modalidad; referencia a
   * hiring.causales_contratacion (actividad 3.6).
   *
   * Nula en las nueve modalidades donde la matriz no marca la actividad, y
   * también en las dos donde sí mientras el abogado no la haya elegido. Vive
   * junto a la modalidad porque es del proceso: la lee la 5.1 para redactar el
   * acto de justificación de la directa, no solo la pantalla de la 3.6.
   */
  @Column({ length: 60, nullable: true })
  causal: string | null;

  /** Por qué el objeto encaja en esa causal, en palabras del abogado. */
  @Column({ name: 'causal_sustento', type: 'text', nullable: true })
  causalSustento: string | null;

  /**
   * Valor estimado del contrato, en pesos.
   *
   * Vive en el proceso y no en el estudio previo porque la modalidad se
   * determina por cuantía (EFDS-1147) y hay que conocerla al crear el proceso,
   * antes de que exista el estudio previo.
   *
   * `numeric` llega como string desde el driver; el transformer lo devuelve
   * como número para que el cálculo de umbrales no compare cadenas.
   */
  @Column({
    name: 'valor_estimado',
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: {
      to: (valor: number | null) => valor,
      from: (valor: string | null) => (valor === null ? null : Number(valor)),
    },
  })
  valorEstimado: number | null;

  /** Etapa de la matriz de flujo. Este HU trabaja siempre sobre la 3. */
  @Column({ type: 'int', default: 3 })
  etapa: number;

  /**
   * Desenlace del proceso de selección (EFDS-1160).
   *
   * Distinto de la etapa y del riel de actividades, que dicen en qué va: esto
   * dice si ya terminó y cómo. Un proceso se adjudica (EFDS-1159) o se declara
   * desierto, y mientras no pase ninguna de las dos cosas está en curso.
   */
  @Column({ length: 20, default: 'EN_CURSO' })
  estado: EstadoProceso;

  /**
   * Línea del PAA de la que sale, en la última versión que se le aplicó.
   *
   * Nula en los procesos creados antes de la 097: inventarles un origen
   * falsearía el expediente, y ninguna actualización del PAA los toca.
   */
  @Column({ name: 'paa_linea_id', type: 'uuid', nullable: true })
  paaLineaId: string | null;

  /** `LINEA 12`: se guarda aparte para no tener que cruzar la línea al listar. */
  @Column({ name: 'paa_codigo', length: 40, nullable: true })
  paaCodigo: string | null;

  @Column({ name: 'paa_region_id', type: 'uuid', nullable: true })
  paaRegionId: string | null;

  @Column({ name: 'paa_anio', type: 'smallint', nullable: true })
  paaAnio: number | null;

  /**
   * Lo que trajo el PAA la última vez que se le aplicó, por campo de la 3.1.
   *
   * Es lo que permite decir si un valor de la 3.1 lo sigue controlando el
   * Excel o alguien lo corrigió a mano: si coincide con esto, vino del PAA y
   * una versión nueva puede reemplazarlo; si no, es del usuario y se respeta.
   */
  @Column({ name: 'paa_origen', type: 'jsonb', nullable: true })
  paaOrigen: Record<string, unknown> | null;

  @Column({ name: 'cancelado_por', length: 150, nullable: true })
  canceladoPor: string | null;

  @Column({ name: 'cancelado_at', type: 'timestamptz', nullable: true })
  canceladoAt: Date | null;

  @Column({ name: 'motivo_cancelacion', type: 'text', nullable: true })
  motivoCancelacion: string | null;

  @Column({ name: 'fecha_radicacion', type: 'timestamptz', default: () => 'now()' })
  fechaRadicacion: Date;

  @Column({ name: 'created_by', length: 120, nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => Expediente, (e) => e.proceso)
  expediente?: Expediente;
}

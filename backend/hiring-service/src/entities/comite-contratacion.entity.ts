import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

/** `numeric` llega como string desde el driver; se devuelve como número. */
const aNumero = {
  to: (valor: number) => valor,
  from: (valor: string) => Number(valor),
};

/**
 * Qué decidió el comité.
 *
 * «Va o No / observa o no / aprueba o no». El «va o no» no es una decisión del
 * comité sino la condición que lo convoca —la matriz por modalidad y el umbral
 * de cuantía—, así que no vive aquí: una sesión que no se celebró no tiene
 * decisión que registrar.
 *
 * Los dos «no» son distintos y por eso son dos desenlaces. `OBSERVADO` dice
 * qué falta y el proceso vuelve corregido; `RECHAZADO` dice que el proceso no
 * debe salir al mercado, y ahí no hay corrección que traer. Antes solo existía
 * el primero, con el argumento de que no contratar se negaba en la 3.4: eso
 * obligaba a que otro firmara lo que el comité ya había decidido en su sesión
 * y con su acta.
 */
export type DecisionComite =
  | 'APROBADO'
  | 'APROBADO_CON_CONDICIONES'
  | 'OBSERVADO'
  | 'RECHAZADO';

/**
 * Condición de cuantía para pasar por el comité de contratación.
 *
 * Una fila por modalidad y solo para las que la tienen: hoy únicamente la
 * contratación directa, que va a comité cuando supera 1.000 SMMLV (RF-DOC-05).
 * La modalidad sin fila va a comité siempre que la matriz la marque.
 */
@Entity('umbrales_comite_contratacion', { schema: 'hiring' })
export class UmbralComiteContratacion {
  @PrimaryColumn({ length: 60 })
  modalidad: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: aNumero })
  valor: number;

  /**
   * En SMMLV, como los umbrales de modalidad: el salario cambia cada año por
   * decreto y una cifra en pesos quedaría vieja en enero.
   */
  @Column({ length: 10, default: 'SMMLV' })
  unidad: 'SMMLV' | 'PESOS';

  /** De dónde sale la cifra, para poder leerla junto al número al validarla. */
  @Column({ type: 'text', nullable: true })
  fundamento: string | null;

  /** False mientras la Dirección de Contratación no confirme la cifra. */
  @Column({ type: 'boolean', default: false })
  confirmado: boolean;
}

/**
 * Una sesión del comité de contratación sobre un proceso — actividad 3.7.
 *
 * Una fila por sesión: observar devuelve los documentos al proceso, que los
 * corrige y vuelve a comité. Con una sola fila por proceso, la segunda sesión
 * pisaría a la primera y el expediente perdería lo que explica la demora.
 */
@Entity('sesiones_comite_contratacion', { schema: 'hiring' })
export class SesionComiteContratacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  /** La de la sesión, que no es la de la transcripción. */
  @Column({ type: 'date' })
  fecha: string;

  @Column({ length: 30 })
  decision: DecisionComite;

  /** A qué queda sujeta la aprobación condicionada. */
  @Column({ type: 'text', nullable: true })
  condiciones: string | null;

  /** Las observaciones de fondo, cuando el comité no aprueba todavía. */
  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  /**
   * El acta de la sesión.
   *
   * Nullable en la base por las sesiones que pudieran migrarse de registros
   * viejos; el servicio la exige al registrar, porque es lo único que prueba
   * que un cuerpo colegiado sesionó.
   */
  @Column({ name: 'acta_documento_id', type: 'uuid', nullable: true })
  actaDocumentoId: string | null;

  @Column({ name: 'registrado_por', length: 120, nullable: true })
  registradoPor: string | null;

  @Column({ name: 'registrado_por_id', length: 120, nullable: true })
  registradoPorId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

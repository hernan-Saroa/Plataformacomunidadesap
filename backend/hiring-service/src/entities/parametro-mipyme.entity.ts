import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Las dos condiciones que habilitan la limitación. */
export type ClaveParametroMipyme = 'TOPE_VALOR' | 'MINIMO_MANIFESTACIONES';

export type UnidadTope = 'SMMLV' | 'PESOS';

/** `numeric` llega como string desde el driver; se devuelve como número. */
const aNumero = {
  to: (valor: number) => valor,
  from: (valor: string) => Number(valor),
};

/**
 * Condición parametrizable de la limitación a MIPYME (EFDS-1393).
 *
 * Clave-valor y no columnas fijas porque cada parámetro lleva su propio
 * fundamento y su propia marca de confirmado: uno puede estar validado y el
 * otro no, y con columnas habría que confirmarlos en bloque.
 */
@Entity('parametros_mipyme', { schema: 'hiring' })
export class ParametroMipyme {
  @PrimaryColumn({ length: 40 })
  clave: ClaveParametroMipyme;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: aNumero })
  valor: number;

  /** Nula en el mínimo de manifestaciones, que es un conteo sin unidad. */
  @Column({ length: 10, nullable: true })
  unidad: UnidadTope | null;

  @Column({ length: 200 })
  descripcion: string;

  /**
   * De dónde sale la cifra. Importa especialmente en el tope: el decreto lo
   * expresa en dólares y su equivalente aquí es una derivación, no un dato
   * oficial.
   */
  @Column({ type: 'text', nullable: true })
  fundamento: string | null;

  /** False mientras la Dirección de Contratación no confirme la cifra. */
  @Column({ type: 'boolean', default: false })
  confirmado: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

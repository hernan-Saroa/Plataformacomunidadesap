import { Column, Entity, PrimaryColumn } from 'typeorm';

/** `numeric` llega como string desde el driver; se devuelve como número. */
const aNumero = {
  to: (valor: number | null) => valor,
  from: (valor: string | null) => (valor === null ? null : Number(valor)),
};

/**
 * Salario mínimo mensual legal vigente, por año.
 *
 * Vive en base de datos y no como constante porque cambia cada año por decreto
 * y de él dependen todos los umbrales expresados en SMMLV: al cargar el salario
 * nuevo, los umbrales se recalculan solos.
 */
@Entity('smmlv', { schema: 'hiring' })
export class Smmlv {
  @PrimaryColumn({ type: 'int' })
  anio: number;

  @Column({ type: 'numeric', precision: 18, scale: 2, transformer: aNumero })
  valor: number;

  /** Mientras sea false, el valor es un supuesto y no un dato verificado. */
  @Column({ type: 'boolean', default: false })
  confirmado: boolean;
}

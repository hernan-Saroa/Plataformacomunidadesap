import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export type TipoCampo = 'texto' | 'texto_largo' | 'numero' | 'moneda' | 'seleccion';

/**
 * Definición del formulario de cada actividad. El HU pide parametrizar
 * los campos obligatorios en vez de fijarlos en código: agregar un campo
 * es insertar una fila aquí.
 */
@Entity('campos_formulario', { schema: 'hiring' })
@Unique('uq_campo', ['numeral', 'codigo'])
export class CampoFormulario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  numeral: string;

  @Column({ length: 80 })
  codigo: string;

  @Column({ length: 300 })
  etiqueta: string;

  @Column({ type: 'text', nullable: true })
  ayuda: string;

  @Column({ length: 30 })
  tipo: TipoCampo;

  @Column({ default: false })
  obligatorio: boolean;

  @Column({ length: 120, nullable: true })
  grupo: string;

  @Column({ type: 'int' })
  orden: number;

  /** Valores admitidos cuando tipo = 'seleccion'. */
  @Column({ type: 'jsonb', nullable: true })
  opciones: string[];

  @Column({ default: true })
  activo: boolean;

  /**
   * El campo se muestra pero no se edita porque su valor vive fuera del
   * formulario. Hoy solo aplica a `valor_estimado`, que se captura al crear el
   * proceso para poder determinar la modalidad por cuantía (EFDS-1147).
   */
  @Column({ name: 'solo_lectura', default: false })
  soloLectura: boolean;
}

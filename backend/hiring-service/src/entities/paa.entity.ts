import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Plan Anual de Adquisiciones (migraciones 097 y 099).
 *
 * Las nueve tablas van juntas porque solo tienen sentido juntas: una versión sin
 * sus líneas, o una revisión sin la versión que la originó, no se entienden.
 */

/**
 * El Excel del PAA que publica un territorio (migración 099).
 *
 * Cada territorio publica el suyo; el de la Sede Central trae además las líneas
 * de Chocó. Las vigencias, y con ellas las versiones y el cambio de año, son de
 * cada documento.
 */
@Entity('paa_documentos', { schema: 'hiring' })
export class PaaDocumento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 40, unique: true })
  codigo: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ name: 'created_by', length: 150, nullable: true })
  createdBy: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}

/** Quién contrata con su propio bloque del PAA: la Sede Central, el Chocó… */
@Entity('paa_regiones', { schema: 'hiring' })
export class PaaRegion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** En qué Excel vienen sus líneas. No cambia. */
  @Column({ name: 'documento_id', type: 'uuid' })
  documentoId: string;

  @Column({ length: 40, unique: true })
  codigo: string;

  @Column({ length: 150 })
  nombre: string;

  /** Lo que antecede al número en la descripción: «LINEA 12 - …». */
  @Column({ name: 'prefijo_linea', length: 30, unique: true })
  prefijoLinea: string;

  /** Cómo la nombra la columna «Unidad de contratación (referencia)». */
  @Column({ name: 'unidad_contratacion', length: 150 })
  unidadContratacion: string;

  @Column({ default: true })
  activa: boolean;

  @Column({ name: 'created_by', length: 150, nullable: true })
  createdBy: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

/** Un año del PAA de un documento. Solo uno por documento está vigente para crear procesos. */
@Entity('paa_vigencias', { schema: 'hiring' })
export class PaaVigencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'documento_id', type: 'uuid' })
  documentoId: string;

  @Column({ type: 'smallint' })
  anio: number;

  @Column({ default: false })
  vigente: boolean;

  @Column({ name: 'declarada_vigente_por', length: 150, nullable: true })
  declaradaVigentePor: string | null;

  @Column({ name: 'declarada_vigente_at', type: 'timestamptz', nullable: true })
  declaradaVigenteAt: Date | null;

  @Column({ name: 'created_by', length: 150, nullable: true })
  createdBy: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}

/**
 * - `INVALIDA`: no pasó la validación; queda con su reporte y no reemplaza nada.
 * - `VALIDADA`: se puede activar, pero todavía no es de donde salen los procesos.
 * - `ACTIVA`: la de la vigencia; una sola a la vez.
 * - `REEMPLAZADA`: fue activa y la sucedió otra.
 * - `DESCARTADA`: se validó y alguien decidió no activarla.
 */
export type EstadoVersionPaa = 'INVALIDA' | 'VALIDADA' | 'ACTIVA' | 'REEMPLAZADA' | 'DESCARTADA';

/** Un mensaje de validación que señala dónde está el problema. */
export interface HallazgoPaa {
  fila: number | null;
  columna: string | null;
  valor: string | null;
  mensaje: string;
}

@Entity('paa_versiones', { schema: 'hiring' })
export class PaaVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vigencia_id', type: 'uuid' })
  vigenciaId: string;

  @Column({ type: 'int' })
  numero: number;

  @Column({ name: 'nombre_archivo', length: 300 })
  nombreArchivo: string;

  @Column({ name: 'ruta_archivo', length: 500 })
  rutaArchivo: string;

  @Column({ length: 64 })
  sha256: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  encabezados: string[];

  @Column({ length: 15 })
  estado: EstadoVersionPaa;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  errores: HallazgoPaa[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  advertencias: HallazgoPaa[];

  @Column({ name: 'total_lineas', type: 'int', default: 0 })
  totalLineas: number;

  @Column({ name: 'cargada_por', length: 150, nullable: true })
  cargadaPor: string | null;

  @Column({ name: 'cargada_por_id', length: 120, nullable: true })
  cargadaPorId: string | null;

  @Column({ name: 'cargada_at', type: 'timestamptz', default: () => 'now()' })
  cargadaAt: Date;

  @Column({ name: 'activada_por', length: 150, nullable: true })
  activadaPor: string | null;

  @Column({ name: 'activada_at', type: 'timestamptz', nullable: true })
  activadaAt: Date | null;

  @Column({ name: 'descartada_por', length: 150, nullable: true })
  descartadaPor: string | null;

  @Column({ name: 'descartada_at', type: 'timestamptz', nullable: true })
  descartadaAt: Date | null;

  @Column({ name: 'motivo_descarte', type: 'text', nullable: true })
  motivoDescarte: string | null;

  @Column({ name: 'reemplazada_at', type: 'timestamptz', nullable: true })
  reemplazadaAt: Date | null;
}

/** Valores de una línea por la clave estable de cada columna. */
export type ValoresLineaPaa = Record<string, string | number | null>;

@Entity('paa_lineas', { schema: 'hiring' })
export class PaaLinea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'version_id', type: 'uuid' })
  versionId: string;

  @Column({ name: 'region_id', type: 'uuid' })
  regionId: string;

  /** `LINEA 12`, `CHOCO 3`: la clave que se mantiene entre versiones. */
  @Column({ length: 40 })
  codigo: string;

  @Column({ type: 'int' })
  fila: number;

  @Column({ type: 'jsonb' })
  valores: ValoresLineaPaa;

  @Column({ length: 64 })
  huella: string;
}

@Entity('paa_campos_visibles', { schema: 'hiring' })
export class PaaCampoVisible {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'region_id', type: 'uuid' })
  regionId: string;

  @Column({ name: 'vigencia_id', type: 'uuid' })
  vigenciaId: string;

  @Column({ length: 80 })
  clave: string;

  @Column({ default: true })
  visible: boolean;

  @Column({ type: 'int' })
  orden: number;

  @Column({ length: 300, nullable: true })
  etiqueta: string | null;

  /** Si sale en el bloque «Datos del PAA» de la 3.1, aparte de si se ve al elegir la línea. */
  @Column({ name: 'en_estudio_previo', default: false })
  enEstudioPrevio: boolean;

  @Column({ default: false })
  huerfana: boolean;

  @Column({ name: 'updated_by', length: 150, nullable: true })
  updatedBy: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

export type TipoComparacionPaa = 'MISMA_VIGENCIA' | 'CAMBIO_VIGENCIA';

@Entity('paa_comparaciones', { schema: 'hiring' })
export class PaaComparacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'version_base_id', type: 'uuid' })
  versionBaseId: string;

  @Column({ name: 'version_nueva_id', type: 'uuid' })
  versionNuevaId: string;

  @Column({ length: 20 })
  tipo: TipoComparacionPaa;

  @Column()
  confiable: boolean;

  @Column({ type: 'jsonb' })
  resumen: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  detalle: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}

export type TipoAplicacionPaa = 'CREACION' | 'ACTUALIZACION' | 'MIGRACION';

/** Un campo que el PAA cambió, o que habría cambiado si nadie lo hubiera tocado. */
export interface CampoAplicado {
  campo: string;
  etiqueta: string;
  antes: unknown;
  despues: unknown;
  aplicado: boolean;
  motivo?: string;
}

@Entity('paa_aplicaciones', { schema: 'hiring' })
export class PaaAplicacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  @Column({ name: 'linea_origen_id', type: 'uuid', nullable: true })
  lineaOrigenId: string | null;

  @Column({ name: 'linea_destino_id', type: 'uuid' })
  lineaDestinoId: string;

  @Column({ length: 20 })
  tipo: TipoAplicacionPaa;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  campos: CampoAplicado[];

  @Column({ name: 'aplicado_por', length: 150, nullable: true })
  aplicadoPor: string | null;

  @Column({ name: 'aplicado_at', type: 'timestamptz', default: () => 'now()' })
  aplicadoAt: Date;
}

export type TipoRevisionPaa = 'MODIFICACION' | 'ELIMINACION' | 'CAMBIO_VIGENCIA';

/** Un campo de la línea que cambió entre versiones. */
export interface CambioDeLinea {
  campo: string;
  etiqueta: string;
  antes: string | number | null;
  despues: string | number | null;
}

/**
 * Lo que vio quien abrió la revisión: qué cambió en la línea (todo, incluso lo
 * informativo) y qué se le hizo o no al proceso por eso.
 */
export interface CambiosRevisionPaa {
  linea: CambioDeLinea[];
  proceso: CampoAplicado[];
}
export type DecisionRevisionPaa = 'CONTINUAR' | 'DEVOLVER' | 'MIGRAR' | 'CANCELAR';

@Entity('paa_revisiones', { schema: 'hiring' })
export class PaaRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  @Column({ name: 'comparacion_id', type: 'uuid', nullable: true })
  comparacionId: string | null;

  @Column({ name: 'version_anterior_id', type: 'uuid' })
  versionAnteriorId: string;

  @Column({ name: 'version_nueva_id', type: 'uuid' })
  versionNuevaId: string;

  @Column({ length: 40 })
  codigo: string;

  @Column({ length: 20 })
  tipo: TipoRevisionPaa;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  cambios: CambiosRevisionPaa;

  @Column({ type: 'text' })
  motivo: string;

  @Column()
  bloquea: boolean;

  @Column({ name: 'responsable_id', length: 120, nullable: true })
  responsableId: string | null;

  @Column({ name: 'responsable_nombre', length: 200, nullable: true })
  responsableNombre: string | null;

  @Column({ length: 15, default: 'PENDIENTE' })
  estado: 'PENDIENTE' | 'RESUELTA';

  @Column({ length: 15, nullable: true })
  decision: DecisionRevisionPaa | null;

  @Column({ type: 'text', nullable: true })
  justificacion: string | null;

  @Column({ name: 'linea_destino_id', type: 'uuid', nullable: true })
  lineaDestinoId: string | null;

  @Column({ name: 'decidida_por', length: 150, nullable: true })
  decididaPor: string | null;

  @Column({ name: 'decidida_por_id', length: 120, nullable: true })
  decididaPorId: string | null;

  @Column({ name: 'decidida_at', type: 'timestamptz', nullable: true })
  decididaAt: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}

export const ENTIDADES_PAA = [
  PaaDocumento,
  PaaRegion,
  PaaVigencia,
  PaaVersion,
  PaaLinea,
  PaaCampoVisible,
  PaaComparacion,
  PaaAplicacion,
  PaaRevision,
];

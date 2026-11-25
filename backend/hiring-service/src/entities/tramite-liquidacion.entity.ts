import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Trámite de liquidación o de cierre del contrato, dentro del proceso (151).
 *
 * Se radica cuando terminó la etapa 9 —salvo la 9.2 y la 9.3, que siguen
 * abiertas hasta el final— y radicarlo abre la etapa 10. Los contratos PSPAG
 * llevan el de cierre; todos los demás, el de liquidación.
 */

export type ClaseTramiteLiquidacion = 'LIQUIDACION' | 'CIERRE';

export type EstadoTramiteLiquidacion =
  | 'RADICADA'
  | 'EN_REVISION'
  | 'DEVUELTA'
  | 'ACTA'
  | 'EN_VISTO_BUENO'
  | 'EN_FIRMA'
  | 'PERFECCIONADA'
  | 'PUBLICADA'
  | 'CERRADA'
  | 'DESISTIDA';

@Entity('tramites_liquidacion', { schema: 'hiring' })
export class TramiteLiquidacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  radicado: string;

  @Column({ length: 12 })
  clase: ClaseTramiteLiquidacion;

  @Column({ name: 'proceso_id', type: 'uuid' })
  procesoId: string;

  @Column({ name: 'contrato_id', type: 'uuid' })
  contratoId: string;

  @Column({ length: 20, default: 'RADICADA' })
  estado: EstadoTramiteLiquidacion;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'abogado_id', type: 'varchar', length: 120, nullable: true })
  abogadoId: string | null;

  @Column({ name: 'abogado_nombre', type: 'varchar', length: 200, nullable: true })
  abogadoNombre: string | null;

  /** Quien asignó: la líder de la revisión y del visto bueno. */
  @Column({ name: 'lider_id', type: 'varchar', length: 120, nullable: true })
  liderId: string | null;

  @Column({ name: 'lider_nombre', type: 'varchar', length: 200, nullable: true })
  liderNombre: string | null;

  @Column({ name: 'asignada_at', type: 'timestamptz', nullable: true })
  asignadaAt: Date | null;

  @Column({ name: 'tipo_acta', type: 'varchar', length: 12, nullable: true })
  tipoActa: 'BILATERAL' | 'UNILATERAL' | null;

  @Column({ name: 'fecha_acta', type: 'date', nullable: true })
  fechaActa: string | null;

  @Column({ name: 'acta_liquidacion_id', type: 'uuid', nullable: true })
  actaLiquidacionId: string | null;

  @Column({ name: 'perfeccionada_por', type: 'varchar', length: 200, nullable: true })
  perfeccionadaPor: string | null;

  @Column({ name: 'perfeccionada_at', type: 'timestamptz', nullable: true })
  perfeccionadaAt: Date | null;

  @Column({ name: 'cierre_contrato_id', type: 'uuid', nullable: true })
  cierreContratoId: string | null;

  @Column({ name: 'secop_numero', type: 'varchar', length: 80, nullable: true })
  secopNumero: string | null;

  @Column({ name: 'secop_url', type: 'text', nullable: true })
  secopUrl: string | null;

  @Column({ name: 'fecha_publicacion', type: 'date', nullable: true })
  fechaPublicacion: string | null;

  @Column({ name: 'publicada_por', type: 'varchar', length: 200, nullable: true })
  publicadaPor: string | null;

  @Column({ name: 'publicada_at', type: 'timestamptz', nullable: true })
  publicadaAt: Date | null;

  @Column({ name: 'motivo_cierre', type: 'text', nullable: true })
  motivoCierre: string | null;

  @Column({ name: 'cerrada_por', type: 'varchar', length: 200, nullable: true })
  cerradaPor: string | null;

  @Column({ name: 'cerrada_at', type: 'timestamptz', nullable: true })
  cerradaAt: Date | null;

  @Column({ name: 'radicada_por', type: 'varchar', length: 200, nullable: true })
  radicadaPor: string | null;

  @Column({ name: 'radicada_por_id', type: 'varchar', length: 120, nullable: true })
  radicadaPorId: string | null;

  @Column({ name: 'radicada_at', type: 'timestamptz', default: () => 'now()' })
  radicadaAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

export type ClaseDocumentoLiquidacion = 'REQUISITO' | 'ACTA' | 'ACTA_FIRMADA' | 'PAZ_Y_SALVO' | 'EVIDENCIA_SECOP';

@Entity('documentos_tramite_liquidacion', { schema: 'hiring' })
export class DocumentoTramiteLiquidacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tramite_id', type: 'uuid' })
  tramiteId: string;

  @Column({ length: 20 })
  clase: ClaseDocumentoLiquidacion;

  @Column({ name: 'requisito_id', type: 'uuid', nullable: true })
  requisitoId: string | null;

  @Column({ length: 300 })
  nombre: string;

  @Column({ name: 'archivo_url', type: 'text' })
  archivoUrl: string;

  @Column({ name: 'archivo_nombre_original', type: 'varchar', length: 300, nullable: true })
  archivoNombreOriginal: string | null;

  @Column({ name: 'archivo_mime_type', type: 'varchar', length: 120, nullable: true })
  archivoMimeType: string | null;

  @Column({ name: 'archivo_tamano', type: 'bigint', nullable: true })
  archivoTamano: number | null;

  @Column({ name: 'hash_sha256', type: 'char', length: 64 })
  hashSha256: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ default: true })
  vigente: boolean;

  @Column({ name: 'subido_por', type: 'varchar', length: 200, nullable: true })
  subidoPor: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}

export type FaseCadenaLiquidacion = 'REVISION' | 'VISTO_BUENO';
export type PapelLiquidacion = 'ABOGADO' | 'LIDER';
export type AccionLiquidacion = 'APROBAR' | 'DEVOLVER';

/** Un escalón de una de las dos cadenas de la liquidación. */
export interface EscalonLiquidacion {
  nombre: string;
  /** El abogado o la líder del trámite. */
  papel: PapelLiquidacion | null;
  /** O cualquiera que tenga alguno de estos roles. */
  roles: string[];
  acciones: AccionLiquidacion[];
}

@Entity('cadenas_liquidacion', { schema: 'hiring' })
export class CadenaLiquidacion {
  @PrimaryColumn({ length: 12 })
  fase: FaseCadenaLiquidacion;

  @Column({ type: 'jsonb' })
  escalones: EscalonLiquidacion[];

  @Column({ default: false })
  confirmado: boolean;

  @Column({ name: 'updated_by', type: 'varchar', length: 200, nullable: true })
  updatedBy: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

export type EstadoRondaLiquidacion = 'EN_CURSO' | 'APROBADA' | 'DEVUELTA' | 'CANCELADA';

export interface EscalonLiquidacionEnRonda extends EscalonLiquidacion {
  orden: number;
  estado: 'BLOQUEADO' | 'PENDIENTE' | 'APROBADO' | 'DEVUELTO' | 'ANULADO';
  decididoPor?: string | null;
  decididoPorId?: string | null;
  decididoAt?: string | null;
}

@Entity('rondas_liquidacion', { schema: 'hiring' })
export class RondaLiquidacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tramite_id', type: 'uuid' })
  tramiteId: string;

  @Column({ length: 12 })
  fase: FaseCadenaLiquidacion;

  @Column({ type: 'int' })
  ronda: number;

  @Column({ length: 12, default: 'EN_CURSO' })
  estado: EstadoRondaLiquidacion;

  @Column({ name: 'escalon_actual', type: 'int', nullable: true })
  escalonActual: number | null;

  /** Copia de la cadena el día que se abrió: cambiar la configuración no la mueve. */
  @Column({ type: 'jsonb' })
  escalones: EscalonLiquidacionEnRonda[];

  @Column({ name: 'iniciada_por', type: 'varchar', length: 200, nullable: true })
  iniciadaPor: string | null;

  @Column({ name: 'iniciada_at', type: 'timestamptz', default: () => 'now()' })
  iniciadaAt: Date;

  @Column({ name: 'cerrada_at', type: 'timestamptz', nullable: true })
  cerradaAt: Date | null;
}

@Entity('eventos_tramite_liquidacion', { schema: 'hiring' })
export class EventoTramiteLiquidacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tramite_id', type: 'uuid' })
  tramiteId: string;

  @Column({ length: 30 })
  accion: string;

  @Column({ name: 'ronda_id', type: 'uuid', nullable: true })
  rondaId: string | null;

  @Column({ type: 'int', nullable: true })
  escalon: number | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  detalle: Record<string, unknown>;

  @Column({ type: 'varchar', length: 200, nullable: true })
  por: string | null;

  @Column({ name: 'por_id', type: 'varchar', length: 120, nullable: true })
  porId: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  at: Date;
}

export const ENTIDADES_TRAMITE_LIQUIDACION = [
  TramiteLiquidacion,
  DocumentoTramiteLiquidacion,
  CadenaLiquidacion,
  RondaLiquidacion,
  EventoTramiteLiquidacion,
];

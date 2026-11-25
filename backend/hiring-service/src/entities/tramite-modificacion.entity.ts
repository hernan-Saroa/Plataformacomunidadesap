import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

import type { TipoModificacion } from './modificacion-contrato.entity';

/**
 * Trámite de modificaciones contractuales fuera del proceso (migración 150).
 *
 * Sin contrato vinculado es una notificación: el área avisa con el número del
 * contrato y los documentos, y Contratación tramita por fuera. Con contrato
 * vinculado lleva el flujo completo, y cada cambio es una fila de
 * `modificaciones_contrato`, que es donde viven los efectos sobre el contrato.
 */

/** Un tipo de modificación del catálogo de Configuración. */
@Entity('tipos_modificacion', { schema: 'hiring' })
export class TipoDeModificacion {
  @PrimaryColumn({ length: 60 })
  codigo: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  /** Lo que le hace al contrato al perfeccionarse: lo que el código sabe aplicar. */
  @Column({ length: 30 })
  efecto: TipoModificacion;

  /** No se combina con otros cambios en la misma modificación. */
  @Column({ name: 'va_sola', default: false })
  vaSola: boolean;

  @Column({ default: true })
  activo: boolean;

  @Column({ default: 100 })
  orden: number;

  @Column({ default: false })
  confirmado: boolean;
}

export type EstadoTramiteModificacion =
  | 'RADICADA'
  | 'RECIBIDA'
  | 'EN_REVISION'
  | 'DEVUELTA'
  | 'MINUTA'
  | 'EN_VISTO_BUENO'
  | 'EN_FIRMA'
  | 'PERFECCIONADA'
  | 'PUBLICADA'
  | 'DESISTIDA'
  | 'NEGADA';

/** Lo que el área cuenta de un contrato que no está en la plataforma. Nada se valida. */
export interface DatosContratoAntiguo {
  contratista?: string;
  objeto?: string;
  valor?: number;
  plazo?: string;
  supervisor?: string;
  secopUrl?: string;
}

@Entity('tramites_modificacion', { schema: 'hiring' })
export class TramiteModificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  radicado: string;

  @Column({ name: 'contrato_numero', length: 60 })
  contratoNumero: string;

  @Column({ name: 'contrato_id', type: 'uuid', nullable: true })
  contratoId: string | null;

  @Column({ name: 'proceso_id', type: 'uuid', nullable: true })
  procesoId: string | null;

  /** Códigos de `tipos_modificacion`. */
  @Column({ type: 'varchar', length: 60, array: true })
  tipos: string[];

  @Column({ type: 'text' })
  justificacion: string;

  @Column({ name: 'datos_contrato', type: 'jsonb', default: () => "'{}'::jsonb" })
  datosContrato: DatosContratoAntiguo;

  @Column({ length: 20, default: 'RADICADA' })
  estado: EstadoTramiteModificacion;

  @Column({ name: 'abogado_id', type: 'varchar', length: 120, nullable: true })
  abogadoId: string | null;

  @Column({ name: 'abogado_nombre', type: 'varchar', length: 200, nullable: true })
  abogadoNombre: string | null;

  @Column({ name: 'revisor_id', type: 'varchar', length: 120, nullable: true })
  revisorId: string | null;

  @Column({ name: 'revisor_nombre', type: 'varchar', length: 200, nullable: true })
  revisorNombre: string | null;

  @Column({ name: 'asignada_por', type: 'varchar', length: 200, nullable: true })
  asignadaPor: string | null;

  @Column({ name: 'asignada_at', type: 'timestamptz', nullable: true })
  asignadaAt: Date | null;

  @Column({ name: 'numero_modificacion', type: 'varchar', length: 80, nullable: true })
  numeroModificacion: string | null;

  @Column({ name: 'fecha_suscripcion', type: 'date', nullable: true })
  fechaSuscripcion: string | null;

  @Column({ name: 'perfeccionada_por', type: 'varchar', length: 200, nullable: true })
  perfeccionadaPor: string | null;

  @Column({ name: 'perfeccionada_at', type: 'timestamptz', nullable: true })
  perfeccionadaAt: Date | null;

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

  @Column({ name: 'nota_recibido', type: 'text', nullable: true })
  notaRecibido: string | null;

  @Column({ name: 'recibida_por', type: 'varchar', length: 200, nullable: true })
  recibidaPor: string | null;

  @Column({ name: 'recibida_at', type: 'timestamptz', nullable: true })
  recibidaAt: Date | null;

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

export type ClaseDocumentoTramite = 'REQUISITO' | 'MINUTA' | 'MINUTA_FIRMADA' | 'EVIDENCIA_SECOP' | 'OTRO';

@Entity('documentos_tramite_modificacion', { schema: 'hiring' })
export class DocumentoTramiteModificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tramite_id', type: 'uuid' })
  tramiteId: string;

  @Column({ length: 20 })
  clase: ClaseDocumentoTramite;

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

export type FaseCadenaModificacion = 'REVISION' | 'VISTO_BUENO';
export type PapelModificacion = 'ABOGADO' | 'REVISOR';
export type AccionModificacion = 'APROBAR' | 'DEVOLVER' | 'NEGAR';

/** Un escalón de una de las dos cadenas. */
export interface EscalonModificacion {
  nombre: string;
  /** El abogado o el revisor asignados al trámite. */
  papel: PapelModificacion | null;
  /** O cualquiera que tenga alguno de estos roles. */
  roles: string[];
  acciones: AccionModificacion[];
}

@Entity('cadenas_modificacion', { schema: 'hiring' })
export class CadenaModificacion {
  @PrimaryColumn({ length: 12 })
  fase: FaseCadenaModificacion;

  @Column({ type: 'jsonb' })
  escalones: EscalonModificacion[];

  @Column({ default: false })
  confirmado: boolean;

  @Column({ name: 'updated_by', type: 'varchar', length: 200, nullable: true })
  updatedBy: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}

export type EstadoRondaModificacion = 'EN_CURSO' | 'APROBADA' | 'DEVUELTA' | 'NEGADA' | 'CANCELADA';

/** El estado de cada escalón dentro de una ronda. */
export interface EscalonEnRonda extends EscalonModificacion {
  orden: number;
  estado: 'BLOQUEADO' | 'PENDIENTE' | 'APROBADO' | 'DEVUELTO' | 'NEGADO' | 'ANULADO';
  decididoPor?: string | null;
  decididoPorId?: string | null;
  decididoAt?: string | null;
}

@Entity('rondas_modificacion', { schema: 'hiring' })
export class RondaModificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tramite_id', type: 'uuid' })
  tramiteId: string;

  @Column({ length: 12 })
  fase: FaseCadenaModificacion;

  @Column({ type: 'int' })
  ronda: number;

  @Column({ length: 12, default: 'EN_CURSO' })
  estado: EstadoRondaModificacion;

  @Column({ name: 'escalon_actual', type: 'int', nullable: true })
  escalonActual: number | null;

  /** Copia de la cadena el día que se abrió: cambiar la configuración no la mueve. */
  @Column({ type: 'jsonb' })
  escalones: EscalonEnRonda[];

  @Column({ name: 'iniciada_por', type: 'varchar', length: 200, nullable: true })
  iniciadaPor: string | null;

  @Column({ name: 'iniciada_at', type: 'timestamptz', default: () => 'now()' })
  iniciadaAt: Date;

  @Column({ name: 'cerrada_at', type: 'timestamptz', nullable: true })
  cerradaAt: Date | null;
}

@Entity('eventos_tramite_modificacion', { schema: 'hiring' })
export class EventoTramiteModificacion {
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

export const ENTIDADES_TRAMITE_MODIFICACION = [
  TipoDeModificacion,
  TramiteModificacion,
  DocumentoTramiteModificacion,
  CadenaModificacion,
  RondaModificacion,
  EventoTramiteModificacion,
];

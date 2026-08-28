export type EstadoSolicitudViatico =
  | 'BORRADOR'
  | 'SOLICITADO'
  | 'APROBADO_JEFE'
  | 'APROBADO_TALENTO_HUMANO'
  | 'RESOLUCION_EMITIDA'
  | 'TIQUETES_COMPRADOS'
  | 'EN_COMISION'
  | 'PENDIENTE_LEGALIZACION'
  | 'LEGALIZADO'
  | 'RECHAZADO';

export type TipoComision =
  | 'SERVICIOS_INSTITUCIONALES'
  | 'CAPACITACION_DOCENTE'
  | 'REUNION_TECNICA'
  | 'INSPECCION_TERRITORIAL'
  | 'EVENTO_ACADEMICO';

export type MedioTransporte = 'AEREO' | 'TERRESTRE' | 'VEHICULO_INSTITUCIONAL' | 'MIXTO';

export type PrioridadSolicitud = 'ALTA' | 'MEDIA' | 'BAJA';

/**
 * Estado del formulario de nueva solicitud.
 *
 * Los nombres de campo se alinean con el DTO backend `CreateSolicitudDto`
 * (backend/travel-expenses-service/src/dto/create-solicitud.dto.ts) y con
 * `CreateSolicitudRequest` (snake_case) que consume `viaticosService.crearSolicitudComision`.
 */
export interface FormNuevaSolicitud {
  documentoComisionado: string;
  comisionadoId: string;
  objetoComision: string;
  destinoCiudad: string;
  destinoDepartamento: string;
  fechaInicio: string;
  fechaFin: string;
  rubroPresupuestal: string;
  prioridad: PrioridadSolicitud;
  requiereTiquetes: boolean;
  aceptaHabeasData: boolean;
}

export type TipoComisionado = 'FUNCIONARIO' | 'CONTRATISTA' | 'DOCENTE' | 'ESTUDIANTE' | 'INVESTIGADOR';

export type TipoDocumentoSoporte = 'CDP' | 'RUT' | 'CERT_BANCARIA' | 'SEGURIDAD_SOCIAL' | 'CONTRATO_SECOP';

export interface Comisionado {
  id: string;
  numero_documento: string;
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  email: string;
  telefono_contacto: string;
  tipo_comisionado: TipoComisionado;
  origen_datos: 'HUMANO' | 'SECOP';
  autorizacion_habeas_data: boolean;
  fecha_autorizacion_habeas_data?: Date;
  ip_registro_habeas_data?: string;
}

export interface DocumentoSoporte {
  id: string;
  solicitud_id: string;
  tipo_documento: TipoDocumentoSoporte;
  nombre_archivo_original: string;
  nombre_archivo_seguro: string;
  url_repositorio: string;
  creado_en: Date;
}

export interface SolicitudComisionResponse {
  id: string;
  consecutivo_unico: string;
  comisionado_id: string;
  destino_ciudad: string;
  destino_departamento: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  objeto_comision: string;
  prioridad: string;
  rubro_presupuestal: string;
  requiere_tiquetes: boolean;
  estado_solicitud: string;
  radicado_fuera_jornada: boolean;
  creado_por_usuario_id: string;
  creado_en: Date;
  actualizado_en: Date;
  documentos_soporte?: DocumentoSoporte[];
  warning_message?: string;
}

export interface CreateSolicitudRequest {
  comisionado_id: string;
  destino_ciudad: string;
  destino_departamento: string;
  fecha_inicio: string;
  fecha_fin: string;
  objeto_comision: string;
  prioridad: string;
  rubro_presupuestal: string;
  requiere_tiquetes: boolean;
  creado_por_usuario_id: string;
  acepta_habeas_data?: boolean;
  ip_registro_habeas_data?: string;
  documentos: {
    tipo_documento: TipoDocumentoSoporte;
    nombre_archivo_original: string;
    nombre_archivo_seguro: string;
    url_repositorio: string;
  }[];
}

export interface SolicitudViatico {
  id: string;
  codigo: string;
  cedulaComisionado: string;
  nombreComisionado: string;
  cargoComisionado: string;
  dependencia: string;
  sedeOrigen: string;
  ciudadDestino: string;
  departamentoDestino: string;
  fechaInicio: string;
  fechaFin: string;
  diasComision: number;
  tipoComision: TipoComision;
  medioTransporte: MedioTransporte;
  justificacion: string;
  montoSolicitadoViaticos: number;
  montoSolicitadoGastosViaje: number;
  montoTotalEstimado: number;
  estado: EstadoSolicitudViatico;
  requiereTiqueteAereo: boolean;
  numeroResolucion?: string;
  fechaResolucion?: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface TiqueteAereo {
  id: string;
  solicitudId: string;
  aerolinea: string;
  numeroVueloIda?: string;
  fechaVueloIda?: string;
  horaSalidaIda?: string;
  numeroVueloRegreso?: string;
  fechaVueloRegreso?: string;
  horaSalidaRegreso?: string;
  tarifaTotal: number;
  estadoReserva: 'RESERVADO' | 'EMITIDO' | 'CANCELADO';
  localizador: string;
}

export interface LegalizacionGasto {
  id: string;
  solicitudId: string;
  concepto: 'ALIMENTACION' | 'HOSPEDAJE' | 'TRANSPORTE_LOCAL' | 'PEAJES' | 'IMPREVISTOS';
  proveedor: string;
  nitProveedor?: string;
  numeroFactura: string;
  fechaFactura: string;
  valorFactura: number;
  observaciones?: string;
  soporteUrl?: string;
  aprobado: boolean;
}

export interface ResumenEstadisticoViaticos {
  totalSolicitudes: number;
  enProcesoAprobacion: number;
  enComisionActivas: number;
  pendientesLegalizar: number;
  montoTotalEjecutado: number;
}

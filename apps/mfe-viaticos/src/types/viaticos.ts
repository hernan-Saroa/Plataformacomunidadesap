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
  | 'RECHAZADO'
  | 'RADICADA'
  | 'EXTEMPORANEA';

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
 * (backend/travel-expenses-service/src/dto/create-solicitud.dto.ts). El
 * microservicio serializa sus entidades en camelCase, por lo que el payload
 * de creación (camelCase) y las respuestas (camelCase) son consistentes.
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
  montoViaticos: number;
  montoGastosViaje: number;
  diasComision: number;
  aceptaHabeasData: boolean;
}

export type TipoComisionado = 'FUNCIONARIO' | 'CONTRATISTA' | 'DOCENTE' | 'ESTUDIANTE' | 'INVESTIGADOR';

/**
 * Registro de geopolítica (tabla `auth.geopolitica`) expuesto por el
 * microservicio de auth (estructura-organizacional). Se usa para los
 * selectores de departamento → ciudad.
 */
export interface Geopolitica {
  idGeopolitica: number;
  codGeopolitica?: string;
  codPais?: number;
  codDepartamento?: number;
  codCiudad?: number;
  nomDivGeopolitica: string;
  tipDivision: 'DEPTO' | 'CIUDAD' | string;
  idPadre?: number;
}

export type TipoDocumentoSoporte = 'CDP' | 'RUT' | 'CERT_BANCARIA' | 'SEGURIDAD_SOCIAL' | 'CONTRATO_SECOP';

/** Comisionado tal como lo serializa `ComisionadoEntity` (camelCase). */
export interface Comisionado {
  id: string;
  numeroDocumento: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  email: string;
  telefonoContacto: string;
  tipoComisionado: TipoComisionado;
  origenDatos: 'HUMANO' | 'SECOP';
  autorizacionHabeasData: boolean;
  fechaAutorizacionHabeasData?: Date;
  ipRegistroHabeasData?: string;
}

export interface DocumentoSoporte {
  id: string;
  solicitudId: string;
  tipoDocumento: TipoDocumentoSoporte;
  nombreArchivoOriginal: string;
  nombreArchivoSeguro: string;
  urlRepositorio: string;
  creadoEn: Date;
}

/** Respuesta del backend al crear una solicitud (serialización camelCase). */
export interface SolicitudComisionResponse {
  id: string;
  consecutivoUnico: string;
  comisionadoId: string;
  destinoCiudad: string;
  destinoDepartamento: string;
  fechaInicio: Date;
  fechaFin: Date;
  objetoComision: string;
  prioridad: string;
  rubroPresupuestal: string;
  requiereTiquetes: boolean;
  montoViaticos: number;
  montoGastosViaje: number;
  diasComision: number;
  estadoSolicitud: string;
  radicadoFueraJornada: boolean;
  extemporanea: boolean;
  creadoPorUsuarioId: string;
  creadoEn: Date;
  actualizadoEn: Date;
  documentosSoporte?: DocumentoSoporte[];
  warningMessage?: string;
}

/**
 * Payload de creación alineado con el DTO backend `CreateSolicitudDto`
 * (camelCase). Lo consume `viaticosService.crearSolicitudComision`.
 */
export interface CreateSolicitudRequest {
  comisionadoId: string;
  destinoCiudad: string;
  destinoDepartamento: string;
  fechaInicio: string;
  fechaFin: string;
  objetoComision: string;
  prioridad: string;
  rubroPresupuestal: string;
  requiereTiquetes: boolean;
  montoViaticos: number;
  montoGastosViaje: number;
  diasComision: number;
  creadoPorUsuarioId: string;
  aceptaHabeasData?: boolean;
  ipRegistroHabeasData?: string;
  documentos?: {
    tipoDocumento: TipoDocumentoSoporte;
    nombreArchivoOriginal: string;
    nombreArchivoSeguro: string;
    urlRepositorio: string;
  }[];
}

/**
 * Respuesta del endpoint backend `GET /solicitudes`
 * (lista con datos del comisionado, camelCase).
 */
export interface SolicitudListaResponse {
  id: string;
  consecutivoUnico: string;
  comisionadoId: string;
  comisionado: Pick<
    Comisionado,
    | 'id'
    | 'numeroDocumento'
    | 'primerNombre'
    | 'segundoNombre'
    | 'primerApellido'
    | 'segundoApellido'
    | 'tipoComisionado'
    | 'email'
    | 'telefonoContacto'
    | 'autorizacionHabeasData'
  > | null;
  destinoCiudad: string;
  destinoDepartamento: string;
  fechaInicio: string;
  fechaFin: string;
  objetoComision: string;
  prioridad: string;
  rubroPresupuestal: string;
  requiereTiquetes: boolean;
  montoViaticos: number;
  montoGastosViaje: number;
  diasComision: number;
  estadoSolicitud: string;
  radicadoFueraJornada: boolean;
  extemporanea: boolean;
  creadoPorUsuarioId?: string;
  esCreadoPorMi?: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

/** Modelo de presentación para la tabla de solicitudes. */
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
  extemporanea: boolean;
  radicadoFueraJornada: boolean;
  requiereTiqueteAereo: boolean;
  numeroResolucion?: string;
  fechaResolucion?: string;
  creadoEn: string;
  actualizadoEn: string;
  esCreadoPorMi?: boolean;
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

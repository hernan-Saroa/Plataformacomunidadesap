export type EstadoSolicitudViatico =
  | 'BORRADOR'
  | 'PENDIENTE'
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
  tipoComision?: string;
  esInternacional?: boolean;
  documentos?: DocumentoFormItem[];
}

export type TipoComisionado = 'FUNCIONARIO' | 'CONTRATISTA' | 'DOCENTE' | 'ESTUDIANTE' | 'INVESTIGADOR';

export type CategoriaInvestigador = 'JUNIOR' | 'ASOCIADO' | 'SENIOR';

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

export type TipoDocumentoSoporte =
  | 'CDP'
  | 'RUT'
  | 'CERT_BANCARIA'
  | 'SEGURIDAD_SOCIAL'
  | 'CONTRATO_SECOP'
  | 'PASAPORTE'
  | 'CARTA_INVITACION'
  | 'RESOLUCION_ACTO';

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
  tipoMime: string;
  creadoEn?: Date;
}

export interface DocumentoFormItem {
  id?: string;
  tipoDocumento: TipoDocumentoSoporte;
  nombreArchivoOriginal: string;
  nombreArchivoSeguro: string;
  urlRepositorio: string;
  tipoMime?: string;
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
   tipoComision: string;
   esInternacional: boolean;
   radicadoFueraJornada: boolean;
   extemporanea: boolean;
   creadoPorUsuarioId: string;
   creadoEn: Date;
   actualizadoEn: Date;
   documentosSoporte?: DocumentoSoporte[];
   comisionado?: Comisionado;
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
  modoBorrador?: boolean;
  tipoComision?: string;
  esInternacional?: boolean;
  documentos?: {
    tipoDocumento: TipoDocumentoSoporte;
    nombreArchivoOriginal: string;
    nombreArchivoSeguro: string;
    urlRepositorio: string;
    tipoMime?: string;
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
  borradores: number;
  montoTotalEjecutado: number;
}

export interface ChecklistDocumento {
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface ChecklistDocumentosResponse {
  obligatorios: ChecklistDocumento[];
  opcionales: ChecklistDocumento[];
}

export interface FinalizarSolicitudResponse {
  id: string;
  consecutivoUnico: string;
  estadoSolicitud: EstadoSolicitudViatico;
  extemporanea: boolean;
  radicadoFueraJornada: boolean;
  warningMessage?: string;
}

export interface DesgloseDiaLiquidacion {
  dia: number;
  fecha: string;
  valor: number;
  pernocta: boolean;
}

export interface LiquidacionResponse {
  success: boolean;
  data: {
    salarioBaseAplicado: number;
    decretoAplicado: string;
    tarifaDiariaBase: number;
    factorComisionado: number;
    factorPernocta: number;
    tarifaFinalAplicadaDia: number;
    numeroDiasNoches: number;
    valorTotalViaticos: number;
    desgloseCalculo: DesgloseDiaLiquidacion[];
    alertas?: string[];
  };
}

export interface CalcularLiquidacionRequest {
  comisionadoId?: string;
  tipoComisionado: TipoComisionado;
  asignacionesBasicas?: number[];
  categoriaInvestigador?: CategoriaInvestigador;
  fechaInicio: string;
  fechaFin: string;
  pernocta: boolean;
  destinoCiudad?: string;
  destinoDepartamento?: string;
  aplicaExcepcionRegional?: boolean;
}

// =========================================================================
// RF-LIQ-003 / RF-LIQ-004 — Gestión de tiquetes con restricciones y saldo
// =========================================================================

/** Tipo de transporte aceptado por el validador de tiquetes. */
export type TipoTransporteTiquete = 'AEREO' | 'TERRESTRE';

/** Nivel del semáforo de saldo presupuestal. */
export type NivelAlertaTiquete = 'VERDE' | 'AMARILLO' | 'ROJO';

/** Tipos de excepción que pueden firmar Dirección Nacional o Sindicato. */
export type TipoExcepcionTiquete = 'RUTA_CORTA' | 'PRESUPUESTO_AGOTADO';
export type AutorizadoPorTiquete = 'DIRECTOR_NACIONAL' | 'SINDICATO';

export interface ValidateTicketRequest {
  dependenciaId: string;
  origenCiudad: string;
  destinoCiudad: string;
  tipoTransporte: TipoTransporteTiquete;
  montoEstimadoTiquete: number;
  sedeOrigen?: string;
}

export interface RutaRestringida {
  id: number;
  origenCiudad: string;
  destinoCiudad: string;
  descripcionRestriccion: string | null;
  activo: boolean;
}

export interface SaldoTiquete {
  id: string;
  dependenciaId: string;
  nombreDependencia: string;
  presupuestoInicial: number;
  presupuestoReservado: number;
  presupuestoDisponible: number;
  holguraPorcentaje: number;
  activo: boolean;
}

export interface ExcepcionTiquete {
  id: string;
  solicitudId: string;
  tipoExcepcion: TipoExcepcionTiquete;
  autorizadoPor: AutorizadoPorTiquete;
  numeroDocumentoSoporte: string;
  documentoSoporteUrl?: string | null;
  comentarios?: string | null;
  creadoEn: string;
}

export interface TicketValidationResult {
  is_valid: boolean;
  requires_route_exception: boolean;
  requires_budget_exception: boolean;
  force_land_transport: boolean;
  saldo_actual_dependencia: number;
  holgura_aplicada_porcentaje: number;
  monto_reserva_con_holgura: number;
  ruta_restringida_encontrada: {
    origen: string;
    destino: string;
    descripcion: string;
  } | null;
  message: string;
  nivel_alerta: NivelAlertaTiquete;
  mensaje_alerta: string;
}

export interface CreateExcepcionTiqueteRequest {
  solicitudId: string;
  tipoExcepcion: TipoExcepcionTiquete;
  autorizadoPor: AutorizadoPorTiquete;
  numeroDocumentoSoporte: string;
  documentoSoporteUrl?: string;
  comentarios?: string;
}

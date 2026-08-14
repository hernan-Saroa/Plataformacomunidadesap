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

export interface SolicitudViatico {
  id: string;
  codigo: string; // ej. SOL-VIA-2026-001
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

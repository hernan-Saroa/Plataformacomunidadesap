export class SolicitudResponseDto {
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
  estadoSolicitud: string;
  radicadoFueraJornada: boolean;
  creadoPorUsuarioId: string;
  creadoEn: Date;
  actualizadoEn: Date;
  documentosSoporte?: any[];
  warningMessage?: string;
}

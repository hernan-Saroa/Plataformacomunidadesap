import { RutaItinerarioDto } from './RutaItinerarioDto';

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
  numeroCdp?: string | null;
  fechaCdp?: string | null;
  requiereTiquetes: boolean;
  estadoSolicitud: string;
  radicadoFueraJornada: boolean;
  creadoPorUsuarioId: string;
  creadoEn: Date;
  actualizadoEn: Date;
  documentosSoporte?: any[];
  warningMessage?: string;
  salarioBasico?: number;
  costoEstimadoTiquete?: number;
  camposAdicionales?: Record<string, any>;
  itinerario?: RutaItinerarioDto[];
}

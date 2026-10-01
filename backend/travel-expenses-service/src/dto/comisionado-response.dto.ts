export class ComisionadoResponseDto {
  id: string;
  numeroDocumento: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  email: string;
  telefonoContacto: string;
  tipoComisionado: string;
  origenDatos: string;
  autorizacionHabeasData: boolean;
  fechaAutorizacionHabeasData?: Date;
  ipRegistroHabeasData?: string;
  idDependencia?: number | null;
  fechaInicioContrato?: Date | string | null;
  fechaFinContrato?: Date | string | null;
  salarioBasico?: number | null;
  cargo?: string | null;
  cuentasBancarias?: any[];
  cargos?: any[];
  esFacturadorElectronico?: boolean;
  solicitudesPendientes?: any[];
  creadoEn: Date;
  actualizadoEn: Date;
}


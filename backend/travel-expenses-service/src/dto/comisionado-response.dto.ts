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
  creadoEn: Date;
  actualizadoEn: Date;
}

import { IsString, Length, IsBoolean, IsIn, IsOptional } from 'class-validator';

export class CreateSolicitudDto {
  @IsString()
  @Length(1, 250)
  objetoComision: string;

  @IsString()
  @Length(1, 100)
  destinoCiudad: string;

  @IsString()
  @Length(1, 100)
  destinoDepartamento: string;

  @IsString()
  fechaInicio: string;

  @IsString()
  fechaFin: string;

  @IsString()
  @Length(1, 100)
  rubroPresupuestal: string;

  @IsString()
  @IsIn(['ALTA', 'MEDIA', 'BAJA'])
  prioridad: string;

  @IsBoolean()
  requiereTiquetes: boolean;

  @IsString()
  comisionadoId: string;

  @IsString()
  creadoPorUsuarioId: string;

  @IsOptional()
  @IsBoolean()
  aceptaHabeasData?: boolean;

  @IsOptional()
  @IsString()
  ipRegistroHabeasData?: string;

  @IsOptional()
  documentos?: Array<{
    tipoDocumento: string;
    nombreArchivoOriginal: string;
    nombreArchivoSeguro: string;
    urlRepositorio: string;
  }>;
}

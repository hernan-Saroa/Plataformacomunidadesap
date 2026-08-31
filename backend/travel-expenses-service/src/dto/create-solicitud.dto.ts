import { IsString, Length, IsBoolean, IsIn, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

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

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoViaticos?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoGastosViaje?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  diasComision?: number;

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

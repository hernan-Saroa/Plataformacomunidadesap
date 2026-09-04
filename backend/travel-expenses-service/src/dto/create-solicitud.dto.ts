import {
  IsString,
  Length,
  IsBoolean,
  IsIn,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';

export class CreateSolicitudDto {
  @IsOptional()
  @IsString()
  @Length(0, 250)
  objetoComision?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  destinoCiudad?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  destinoDepartamento?: string;

  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  rubroPresupuestal?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ALTA', 'MEDIA', 'BAJA'])
  prioridad?: string;

  @IsOptional()
  @IsBoolean()
  requiereTiquetes?: boolean;

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
    tipoMime?: string;
  }>;

  @IsOptional()
  @IsBoolean()
  modoBorrador?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['TERRESTRE', 'INTERNACIONAL', 'ACTO_ADMINISTRATIVO'])
  tipoComision?: string;

  @IsOptional()
  @IsBoolean()
  esInternacional?: boolean;
}

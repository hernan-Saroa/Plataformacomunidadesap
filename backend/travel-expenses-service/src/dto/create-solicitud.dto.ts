import {
  IsString,
  Length,
  IsBoolean,
  IsIn,
  IsOptional,
  IsNumber,
  IsInt,
  IsObject,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RutaItinerarioDto } from './RutaItinerarioDto';

export interface DesgloseCalculoDto {
  dia: number;
  fecha: string;
  valor: number;
  pernocta: boolean;
}

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
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  diasComision?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salarioBasico?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costoEstimadoTiquete?: number;

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  idDependencia?: number;

  // ========== Autoliquidación GF-FO-023 (calculada por backend) ==========
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  diasPernoctados?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tarifaDiaPernoctado?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalPernoctados?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  diasNoPernoctados?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tarifaDiaNoPernoctado?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalNoPernoctados?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  factorComisionado?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  factorPernocta?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tarifaDiariaBase?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tarifaFinalAplicadaDia?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salarioBaseAplicado?: number;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  decretoAplicado?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  desgloseCalculo?: DesgloseCalculoDto[];

  @IsOptional()
  @IsArray()
  alertasLiquidacion?: string[];

  @IsOptional()
  @IsObject()
  camposAdicionales?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RutaItinerarioDto)
  itinerario?: RutaItinerarioDto[];
}

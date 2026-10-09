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
  objetoComision?: string;

  @IsOptional()
  @IsString()
  destinoCiudad?: string;

  @IsOptional()
  @IsString()
  destinoDepartamento?: string;

  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  rubroPresupuestal?: string;

  @IsOptional()
  @IsString()
  numeroCdp?: string;

  @IsOptional()
  @IsString()
  fechaCdp?: string;

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

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsNumber()
  idCargo?: number;

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
  @IsIn(['TERRESTRE', 'AEREO', 'MIXTO', 'INTERNACIONAL', 'ACTO_ADMINISTRATIVO'])
  tipoComision?: string;

  @IsOptional()
  @IsBoolean()
  esInternacional?: boolean;

  @IsOptional()
  @Type(() => Number)
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
  desgloseCalculo?: any[];

  @IsOptional()
  @IsArray()
  alertasLiquidacion?: string[];

  @IsOptional()
  @IsObject()
  camposAdicionales?: Record<string, any>;

  @IsOptional()
  @IsObject()
  cuentaBancariaSeleccionada?: {
    id?: string;
    banco?: string;
    tipoCuenta?: string;
    numeroCuenta?: string;
    urlCertificadoBancario?: string;
    nombreArchivoCertificado?: string;
    guardarEnHistorial?: boolean;
  };

  @IsOptional()
  @IsObject()
  cargoSeleccionado?: {
    id?: string;
    idCargo?: number;
    cargo?: string;
    salario?: number;
    guardarEnHistorial?: boolean;
  };

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RutaItinerarioDto)
  itinerario?: RutaItinerarioDto[];
}

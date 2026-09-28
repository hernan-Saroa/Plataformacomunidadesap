import {
  IsString,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

/**
 * Tipos de comisionado para cálculo de viáticos.
 */
export enum TipoComisionadoLiquidacion {
  FUNCIONARIO = 'FUNCIONARIO',
  CONTRATISTA = 'CONTRATISTA',
  DOCENTE = 'DOCENTE',
  ESTUDIANTE = 'ESTUDIANTE',
  INVESTIGADOR = 'INVESTIGADOR',
}

/**
 * Categorías de investigador para tarifas especiales.
 */
export enum CategoriaInvestigador {
  JUNIOR = 'JUNIOR',
  ASOCIADO = 'ASOCIADO',
  SENIOR = 'SENIOR',
}

/**
 * DTO de entrada para calcular la autoliquidación de viáticos.
 */
export class CalcularLiquidacionDto {
  @IsOptional()
  @IsString()
  comisionadoId?: string;

  @IsString()
  @IsEnum(TipoComisionadoLiquidacion)
  tipoComisionado: TipoComisionadoLiquidacion;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  asignacionesBasicas?: number[];

  @IsOptional()
  @IsEnum(CategoriaInvestigador)
  categoriaInvestigador?: CategoriaInvestigador;

  @IsString()
  fechaInicio: string;

  @IsString()
  fechaFin: string;

  @IsBoolean()
  pernocta: boolean;

  @IsOptional()
  @IsString()
  destinoCiudad?: string;

  @IsOptional()
  @IsString()
  destinoDepartamento?: string;

  @IsOptional()
  @IsBoolean()
  aplicaExcepcionRegional?: boolean;

  @IsOptional()
  @IsBoolean()
  incluyeTransporteAereo?: boolean;

  @IsOptional()
  @IsNumber()
  montoTransporteTerrestre?: number;

  @IsOptional()
  @IsArray()
  itinerario?: Array<{
    tipoTransporte?: 'AEREO' | 'TERRESTRE';
    tipoTrayecto?: 'SOLO_IDA' | 'IDA_Y_VUELTA';
    origenCiudad?: string;
    origenDepartamento?: string;
    destinoCiudad?: string;
    destinoDepartamento?: string;
  }>;
}

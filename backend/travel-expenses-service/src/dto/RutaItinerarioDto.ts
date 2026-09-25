import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoTrayecto {
  SOLO_IDA = 'SOLO_IDA',
  IDA_Y_VUELTA = 'IDA_Y_VUELTA',
}

export enum TipoTransporte {
  AEREO = 'AEREO',
  TERRESTRE = 'TERRESTRE',
}

export class RutaItinerarioDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  origenCiudad: string;

  @IsOptional()
  @IsString()
  origenDepartamento?: string;

  @IsString()
  destinoCiudad: string;

  @IsString()
  destinoDepartamento: string;

  @IsEnum(TipoTrayecto)
  tipoTrayecto: TipoTrayecto;

  @IsString()
  fechaSalida: string;

  @IsString()
  fechaLlegada: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  diasRuta: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horarioEstimadoMilitar debe estar en formato HH:mm (ej. 07:30, 14:45)',
  })
  horarioEstimadoMilitar: string;

  @IsOptional()
  @IsEnum(TipoTransporte)
  tipoTransporte?: TipoTransporte;

  @IsOptional()
  @IsBoolean()
  requiereTiquete?: boolean;
}

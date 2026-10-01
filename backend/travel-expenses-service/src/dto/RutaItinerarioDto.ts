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
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum TipoTrayecto {
  SOLO_IDA = 'SOLO_IDA',
  IDA_Y_VUELTA = 'IDA_Y_VUELTA',
}

export enum TipoTransporte {
  AEREO = 'AEREO',
  TERRESTRE = 'TERRESTRE',
  MARITIMO = 'MARITIMO',
  FLUVIAL = 'FLUVIAL',
  FERROVIARIO = 'FERROVIARIO',
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

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim();
    if (!v) return undefined;
    if (/^\d:[0-5]\d$/.test(v)) return `0${v}`;
    if (/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)) return v.slice(0, 5);
    return v;
  })
  @ValidateIf((_, val) => val !== undefined && val !== null && val !== '')
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horarioEstimadoMilitar debe estar en formato HH:mm (ej. 07:30, 14:45)',
  })
  horarioEstimadoMilitar?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim();
    if (!v) return undefined;
    if (/^\d:[0-5]\d$/.test(v)) return `0${v}`;
    if (/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)) return v.slice(0, 5);
    return v;
  })
  @ValidateIf((_, val) => val !== undefined && val !== null && val !== '')
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horaEstimadaSalida debe estar en formato HH:mm (ej. 07:30, 14:45)',
  })
  horaEstimadaSalida?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim();
    if (!v) return undefined;
    if (/^\d:[0-5]\d$/.test(v)) return `0${v}`;
    if (/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)) return v.slice(0, 5);
    return v;
  })
  @ValidateIf((_, val) => val !== undefined && val !== null && val !== '')
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horaEstimadaLlegada debe estar en formato HH:mm (ej. 07:30, 14:45)',
  })
  horaEstimadaLlegada?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  horaSalida?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString()
  horaLlegada?: string;

  @IsOptional()
  @IsEnum(TipoTransporte)
  tipoTransporte?: TipoTransporte;

  @IsOptional()
  @IsBoolean()
  requiereTiquete?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tarifaTerminalAereo?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoTransporteTerrestre?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorTransporte?: number;
}

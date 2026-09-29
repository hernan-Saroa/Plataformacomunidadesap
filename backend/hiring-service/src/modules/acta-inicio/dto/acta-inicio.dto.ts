import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/** El acta de inicio suscrita por las dos partes (actividad 8.7, migración 089). */
export class SuscribirActaDto {
  @ApiProperty({ description: 'Fecha en que las dos partes firmaron el acta (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de suscripción debe tener el formato YYYY-MM-DD' })
  fechaSuscripcion: string;

  /** Solo si la 8.7 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

/** Registro de la reunion de inicio y su acta (EFDS-1167, actividad 9.1). */
export class SuscribirActaInicioDto {
  /** La de la reunion, no la del registro: es cuando arranco la ejecucion. */
  @ApiProperty({ description: 'Fecha de la reunión de inicio (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de inicio debe tener el formato YYYY-MM-DD' })
  fechaInicio: string;

  @ApiProperty({ description: 'Alcance, cronograma y entregables socializados' })
  @IsString()
  @IsNotEmpty({ message: 'Registra que se socializó en la reunión de inicio' })
  @MinLength(10, {
    message: 'Describe los temas tratados: alcance, cronograma y entregables',
  })
  @MaxLength(4000)
  temasTratados: string;

  @ApiPropertyOptional({ description: 'Quienes asistieron por cada parte' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  asistentes?: string;

  /**
   * Si el contrato pacto acta de inicio.
   *
   * La matriz describe el acta como «firmada por ambas partes, si fue pactada
   * en el contrato»: hay contratos que arrancan sin ella. Cuando se pacto, el
   * documento es obligatorio y el servicio lo exige.
   *
   * Llega como texto porque el formulario viaja en multipart junto al archivo,
   * y sin el Transform la validacion recibiria la cadena "false" —que es
   * verdadera— y daria por pactada un acta que no lo esta.
   */
  @ApiPropertyOptional({
    description: 'Si el contrato pacto acta de inicio; por defecto si',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'false' || value === '0') return false;
    if (value === 'true' || value === '1') return true;
    return value;
  })
  @IsBoolean({ message: 'Indica con si o no si el contrato pacto acta de inicio' })
  actaPactada?: boolean;

  /** Solo si la 9.1 quedo configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

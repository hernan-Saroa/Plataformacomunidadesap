import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

export class EmitirAdendaDto {
  @ApiProperty({ description: 'Qué modifica la adenda', enum: ['FONDO', 'CRONOGRAMA'] })
  @IsIn(['FONDO', 'CRONOGRAMA'], {
    message: 'La adenda es de requisitos de fondo (FONDO) o de cronograma (CRONOGRAMA)',
  })
  tipo: 'FONDO' | 'CRONOGRAMA';

  @ApiProperty({ description: 'Qué cambia la adenda' })
  @IsString()
  @IsNotEmpty({ message: 'Describe qué modifica la adenda' })
  @MinLength(10, { message: 'El objeto debe describir el cambio, no una palabra suelta' })
  @MaxLength(4000)
  objeto: string;

  /**
   * Solo en las de cronograma. Se pide al emitir aunque se aplique al publicar:
   * la adenda firmada ya dice a qué fecha se mueve el plazo, y pedirla dos
   * veces abriría la puerta a que el documento y el sistema no coincidan.
   */
  @ApiPropertyOptional({ description: 'Nuevo vencimiento del plazo (YYYY-MM-DD)' })
  @ValidateIf((dto: EmitirAdendaDto) => dto.tipo === 'CRONOGRAMA')
  @IsDateString(
    {},
    { message: 'Una adenda de cronograma necesita la nueva fecha de vencimiento (YYYY-MM-DD)' },
  )
  vencimientoNuevo?: string;
}

export class PublicarAdendaDto {
  /** La de publicación real, no la del registro: es cuando la adenda rige. */
  @ApiProperty({ description: 'Fecha en que se publicó la adenda (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de publicación debe tener el formato YYYY-MM-DD' })
  fechaPublicacion: string;

  /** Solo si la 5.6 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

export class AnularAdendaDto {
  @ApiProperty({ description: 'Por qué se anula la adenda emitida' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se anula la adenda' })
  @MinLength(10, { message: 'El motivo debe explicar la anulación, no una palabra suelta' })
  @MaxLength(1000)
  motivo: string;

  /** Solo si la 5.6 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

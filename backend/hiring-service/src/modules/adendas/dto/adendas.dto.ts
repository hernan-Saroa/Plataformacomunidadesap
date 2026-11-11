import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { FirmaDelMultipart, FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/** Una fecha del cronograma que mueve la adenda (139). */
export class CambioCronogramaAdendaDto {
  @ApiProperty({ description: 'Si mueve una etapa macro o una actividad', enum: ['ETAPA', 'ACTIVIDAD'] })
  @IsIn(['ETAPA', 'ACTIVIDAD'], { message: 'Cada fecha de la adenda es de una etapa o de una actividad' })
  ambito: 'ETAPA' | 'ACTIVIDAD';

  /** La etapa (5 a 10), el numeral de la actividad del flujo o el id de una propia. */
  @ApiProperty({ description: 'Etapa, numeral o id de la actividad propia' })
  @IsString()
  @IsNotEmpty({ message: 'Indica qué etapa o actividad mueve la adenda' })
  @MaxLength(60)
  clave: string;

  @ApiPropertyOptional({ description: 'Nueva fecha de inicio (YYYY-MM-DD); sin ella se conserva la que tenía' })
  @IsOptional()
  @IsDateString({}, { message: 'La nueva fecha de inicio va en formato AAAA-MM-DD' })
  fechaInicio?: string | null;

  @ApiProperty({ description: 'Nueva fecha de fin (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La nueva fecha de fin va en formato AAAA-MM-DD' })
  fechaFin: string;
}

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
  // Opcional desde la revisión de QA de EFDS-1154: cerrada la recepción, la de
  // cronograma no mueve una fecha que la plataforma controle. El servicio la
  // exige mientras haya plazo que prorrogar.
  @ValidateIf((dto: EmitirAdendaDto) => dto.tipo === 'CRONOGRAMA' && !!dto.vencimientoNuevo)
  @IsDateString(
    {},
    { message: 'Una adenda de cronograma necesita la nueva fecha de vencimiento (YYYY-MM-DD)' },
  )
  vencimientoNuevo?: string;

  /**
   * Hora del nuevo cierre de ofertas (HH:MM, Bogotá). Opcional: sin ella se
   * conserva la del cronograma. Solo cuenta cuando la adenda prorroga el
   * cierre de ofertas (revisión de QA de EFDS-1155).
   */
  @ApiPropertyOptional({ description: 'Hora del nuevo cierre de ofertas (HH:MM, Bogotá)' })
  @ValidateIf((dto: EmitirAdendaDto) => dto.tipo === 'CRONOGRAMA' && !!dto.horaNueva)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora del nuevo cierre va en formato HH:MM (24 horas)',
  })
  horaNueva?: string;

  /**
   * Solo en las de cronograma: otras fechas del cronograma de la 5.2 que la
   * adenda mueve (139). Llega como JSON porque la adenda viaja en multipart
   * con su documento. Se aplican al publicarla, como el nuevo cierre.
   */
  @ApiPropertyOptional({ type: [CambioCronogramaAdendaDto], description: 'Fechas del cronograma que mueve' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? plainToInstance(CambioCronogramaAdendaDto, JSON.parse(value) as object[])
      : value,
  )
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => CambioCronogramaAdendaDto)
  cambiosCronograma?: CambioCronogramaAdendaDto[];
}

export class PublicarAdendaDto {
  /** La de publicación real, no la del registro: es cuando la adenda rige. */
  @ApiProperty({ description: 'Fecha en que se publicó la adenda (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de publicación debe tener el formato AAAA-MM-DD' })
  fechaPublicacion: string;

  /** Solo si la 5.13 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @FirmaDelMultipart()
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

  /** Solo si la 5.13 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

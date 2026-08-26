import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Solicitud de adicion en dinero (EFDS-1176).
 *
 * Queda EN_TRAMITE: aprobarla exige despues el CDP y el RP expedidos.
 */
export class SolicitarAdicionDto {
  @ApiProperty({ description: 'Cuanto se adiciona al contrato' })
  @Type(() => Number)
  @IsNumber({}, { message: 'El valor de la adicion debe ser un numero' })
  @IsPositive({ message: 'El valor de la adicion debe ser mayor que cero' })
  valorAdicionado: number;

  @ApiProperty({ description: 'Por que se adiciona el contrato' })
  @IsString()
  @IsNotEmpty({ message: 'Justifica la adicion' })
  @MinLength(20, {
    message: 'Una modificacion sin sustento es lo primero que un ente de control pregunta',
  })
  @MaxLength(4000)
  justificacion: string;
}

/**
 * Aprobacion de la modificacion.
 *
 * Viaja como multipart porque el acto administrativo firmado es obligatorio:
 * aprobar sin documento dejaria al expediente afirmando algo que no puede
 * probar.
 */
export class AprobarModificacionDto {
  @ApiProperty({ description: 'Numero del otrosi o del acto administrativo' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el numero de la modificacion' })
  @MaxLength(80)
  numero: string;

  @ApiProperty({ description: 'Fecha de suscripcion (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de suscripcion debe tener el formato YYYY-MM-DD' })
  fechaSuscripcion: string;
}

/** Rechazo de una modificacion en tramite. */
export class RechazarModificacionDto {
  @ApiProperty({ description: 'Por que se rechaza' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se rechaza la modificacion' })
  @MinLength(10)
  @MaxLength(1000)
  motivo: string;
}

/** Revocacion de una modificacion ya aprobada. */
export class RevocarModificacionDto {
  @ApiProperty({ description: 'Por que se revoca' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se revoca la modificacion' })
  @MinLength(10, {
    message: 'El valor del contrato vuelve atras: sustenta por que se revoca',
  })
  @MaxLength(1000)
  motivo: string;
}

/** Solicitud del CDP o del RP que respalda la adicion. */
export class SolicitarRespaldoDto {
  @ApiProperty({ description: 'Rubro presupuestal' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el rubro presupuestal' })
  @MaxLength(160)
  rubro: string;
}

/** Expedicion del CDP o del RP de la adicion. */
export class ExpedirRespaldoDto {
  @ApiProperty({ description: 'Numero que asigna la Direccion Financiera' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el numero' })
  @MaxLength(60)
  numero: string;

  @ApiProperty({ description: 'Valor certificado o comprometido' })
  @Type(() => Number)
  @IsNumber({}, { message: 'El valor debe ser un numero' })
  @IsPositive({ message: 'El valor debe ser mayor que cero' })
  valor: number;

  @ApiProperty({ description: 'Fecha de expedicion (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de expedicion debe tener el formato YYYY-MM-DD' })
  fechaExpedicion: string;

  @ApiPropertyOptional({ description: 'Vigencia fiscal a la que se imputa' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La vigencia fiscal es un ano' })
  vigenciaFiscal?: number;
}

/** Rechazo del CDP o del RP por falta de disponibilidad. */
export class RechazarRespaldoDto {
  @ApiProperty({ description: 'Por que no hay disponibilidad' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se rechaza' })
  @MinLength(10)
  @MaxLength(1000)
  observaciones: string;
}

/** Registro de la publicacion de la modificacion en SECOP II (RF-MOD-05). */
export class PublicarModificacionDto {
  @ApiProperty({ description: 'Fecha real de la publicacion (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de publicacion debe tener el formato YYYY-MM-DD' })
  fechaPublicacion: string;

  @ApiPropertyOptional({ description: 'Numero con el que quedo publicada' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  secopNumero?: string;

  @ApiPropertyOptional({ description: 'Enlace de la publicacion' })
  @IsOptional()
  @IsUrl({}, { message: 'El enlace debe ser una URL valida' })
  @MaxLength(500)
  secopUrl?: string;
}

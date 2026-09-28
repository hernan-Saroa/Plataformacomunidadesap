import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/**
 * Solicitud de adicion en dinero (EFDS-1176).
 *
 * Queda EN_TRAMITE: aprobarla exige despues el CDP y el RP expedidos.
 */
export class SolicitarAdicionDto {
  @ApiProperty({ description: 'Cuánto se adiciona al contrato' })
  @Type(() => Number)
  @IsNumber({}, { message: 'El valor de la adición debe ser un número' })
  @IsPositive({ message: 'El valor de la adición debe ser mayor que cero' })
  valorAdicionado: number;

  @ApiProperty({ description: 'Por qué se adiciona el contrato' })
  @IsString()
  @IsNotEmpty({ message: 'Justifica la adición' })
  @MinLength(20, {
    message: 'Una modificación sin sustento es lo primero que un ente de control pregunta',
  })
  @MaxLength(4000)
  justificacion: string;
}


/**
 * Justificacion comun a todos los tipos.
 *
 * Con largo minimo por lo mismo que en la adicion: una modificacion sin
 * sustento es lo primero que un ente de control pregunta.
 */
class ConJustificacion {
  @ApiProperty({ description: 'Por qué se modifica el contrato' })
  @IsString()
  @IsNotEmpty({ message: 'Justifica la modificación' })
  @MinLength(20, {
    message: 'Una modificación sin sustento es lo primero que un ente de control pregunta',
  })
  @MaxLength(4000)
  justificacion: string;
}

/**
 * Solicitud de prorroga en tiempo (EFDS-1177, RF-MOD-02).
 *
 * No lleva valor: la prorroga extiende el plazo **sin afectar el presupuesto**,
 * y el CHECK de la migracion 052 lo impide tambien en la base.
 */
export class SolicitarProrrogaDto extends ConJustificacion {
  @ApiProperty({ description: 'Días que se añaden al plazo del contrato' })
  @Type(() => Number)
  @IsInt({ message: 'Los días de prórroga van en números enteros' })
  @IsPositive({ message: 'Una prórroga de cero días no prorroga nada' })
  diasProrroga: number;
}

/** Solicitud de cesion del contrato a otro contratista (EFDS-1178). */
export class SolicitarCesionDto extends ConJustificacion {
  @ApiProperty({ description: 'Documento de quien recibe el contrato' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el documento del cesionario' })
  @MaxLength(40)
  cesionarioDocumento: string;

  @ApiProperty({ description: 'Nombre o razón social de quien recibe el contrato' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el nombre del cesionario' })
  @MaxLength(300)
  cesionarioNombre: string;

  @ApiProperty({ description: 'Si el cesionario es persona natural o jurídica', enum: ['NATURAL', 'JURIDICA'] })
  @IsIn(['NATURAL', 'JURIDICA'], {
    message: 'El cesionario es persona natural o jurídica',
  })
  cesionarioTipo: 'NATURAL' | 'JURIDICA';
}

/**
 * Solicitud de aclaratorio (EFDS-1178).
 *
 * Solo justificacion: el aclaratorio precisa lo que el contrato ya dice y no
 * cambia plazo, valor ni partes. Lo que lo sustenta es el acto que se adjunta
 * al aprobarlo.
 */
export class SolicitarAclaratorioDto extends ConJustificacion {}

/** Solicitud de suspension del contrato (EFDS-1178, RF-SIS-01). */
export class SolicitarSuspensionDto extends ConJustificacion {
  @ApiProperty({ description: 'Desde cuándo queda suspendido', example: '2026-09-01' })
  @IsDateString({}, { message: 'La fecha de suspensión va en formato AAAA-MM-DD' })
  suspensionDesde: string;

  @ApiPropertyOptional({
    description: 'Hasta cuándo se prevé la suspensión; se omite si es indefinida',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha prevista va en formato AAAA-MM-DD' })
  suspensionHasta?: string;
}

/**
 * Solicitud de terminacion anticipada (EFDS-1178, RF-MOD-03).
 *
 * Las dos causales salen de la fuente: «finalizacion anticipada del contrato
 * por mutuo acuerdo o decision unilateral motivada». Terminar por
 * incumplimiento no esta aqui: es el proceso sancionatorio (EFDS-1181).
 */
export class SolicitarTerminacionDto extends ConJustificacion {
  @ApiProperty({
    description: 'Por qué se termina antes de tiempo',
    enum: ['MUTUO_ACUERDO', 'UNILATERAL'],
  })
  @IsIn(['MUTUO_ACUERDO', 'UNILATERAL'], {
    message: 'La terminación anticipada es por mutuo acuerdo o por decisión unilateral motivada',
  })
  terminacionCausal: 'MUTUO_ACUERDO' | 'UNILATERAL';

  @ApiProperty({ description: 'Desde cuándo el contrato deja de ejecutarse', example: '2026-09-30' })
  @IsDateString({}, { message: 'La fecha de terminación va en formato AAAA-MM-DD' })
  terminacionEl: string;
}

/** Solicitud de reanudacion de una suspension vigente (EFDS-1178). */
export class SolicitarReanudacionDto extends ConJustificacion {
  @ApiProperty({ description: 'Desde cuándo el contrato vuelve a correr', example: '2026-10-01' })
  @IsDateString({}, { message: 'La fecha de reanudación va en formato AAAA-MM-DD' })
  reanudadaEl: string;
}

/**
 * Aprobacion de la modificacion.
 *
 * Viaja como multipart porque el acto administrativo firmado es obligatorio:
 * aprobar sin documento dejaria al expediente afirmando algo que no puede
 * probar.
 */
export class AprobarModificacionDto {
  @ApiProperty({ description: 'Número del otrosí o del acto administrativo' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el número de la modificación' })
  @MaxLength(80)
  numero: string;

  @ApiProperty({ description: 'Fecha de suscripción (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de suscripción debe tener el formato YYYY-MM-DD' })
  fechaSuscripcion: string;

  /** Solo si la 9.5 quedo configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

/** Rechazo de una modificacion en tramite. */
export class RechazarModificacionDto {
  @ApiProperty({ description: 'Por qué se rechaza' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se rechaza la modificación' })
  @MinLength(10)
  @MaxLength(1000)
  motivo: string;
}

/** Revocacion de una modificacion ya aprobada. */
export class RevocarModificacionDto {
  @ApiProperty({ description: 'Por qué se revoca' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se revoca la modificación' })
  @MinLength(10, {
    message: 'El valor del contrato vuelve atrás: sustenta por qué se revoca',
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
  @ApiProperty({ description: 'Número que asigna la Dirección Financiera' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el número' })
  @MaxLength(60)
  numero: string;

  @ApiProperty({ description: 'Valor certificado o comprometido' })
  @Type(() => Number)
  @IsNumber({}, { message: 'El valor debe ser un número' })
  @IsPositive({ message: 'El valor debe ser mayor que cero' })
  valor: number;

  @ApiProperty({ description: 'Fecha de expedición (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de expedición debe tener el formato YYYY-MM-DD' })
  fechaExpedicion: string;

  @ApiPropertyOptional({ description: 'Vigencia fiscal a la que se imputa' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La vigencia fiscal es un ano' })
  vigenciaFiscal?: number;
}

/** Rechazo del CDP o del RP por falta de disponibilidad. */
export class RechazarRespaldoDto {
  @ApiProperty({ description: 'Por qué no hay disponibilidad' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se rechaza' })
  @MinLength(10)
  @MaxLength(1000)
  observaciones: string;
}

/** Registro de la publicacion de la modificacion en SECOP II (RF-MOD-05). */
export class PublicarModificacionDto {
  @ApiProperty({ description: 'Fecha real de la publicación (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de publicación debe tener el formato YYYY-MM-DD' })
  fechaPublicacion: string;

  @ApiPropertyOptional({ description: 'Número con el que quedó publicada' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  secopNumero?: string;

  @ApiPropertyOptional({ description: 'Enlace de la publicación' })
  @IsOptional()
  @IsUrl({}, { message: 'El enlace debe ser una URL válida' })
  @MaxLength(500)
  secopUrl?: string;
}

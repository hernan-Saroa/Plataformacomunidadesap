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
 * Justificacion comun a todos los tipos.
 *
 * Con largo minimo por lo mismo que en la adicion: una modificacion sin
 * sustento es lo primero que un ente de control pregunta.
 */
class ConJustificacion {
  @ApiProperty({ description: 'Por que se modifica el contrato' })
  @IsString()
  @IsNotEmpty({ message: 'Justifica la modificacion' })
  @MinLength(20, {
    message: 'Una modificacion sin sustento es lo primero que un ente de control pregunta',
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
  @ApiProperty({ description: 'Dias que se anaden al plazo del contrato' })
  @Type(() => Number)
  @IsInt({ message: 'Los dias de prorroga van en numeros enteros' })
  @IsPositive({ message: 'Una prorroga de cero dias no prorroga nada' })
  diasProrroga: number;
}

/** Solicitud de cesion del contrato a otro contratista (EFDS-1178). */
export class SolicitarCesionDto extends ConJustificacion {
  @ApiProperty({ description: 'Documento de quien recibe el contrato' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el documento del cesionario' })
  @MaxLength(40)
  cesionarioDocumento: string;

  @ApiProperty({ description: 'Nombre o razon social de quien recibe el contrato' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el nombre del cesionario' })
  @MaxLength(300)
  cesionarioNombre: string;

  @ApiProperty({ description: 'Si el cesionario es persona natural o juridica', enum: ['NATURAL', 'JURIDICA'] })
  @IsIn(['NATURAL', 'JURIDICA'], {
    message: 'El cesionario es persona natural o juridica',
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
  @ApiProperty({ description: 'Desde cuando queda suspendido', example: '2026-09-01' })
  @IsDateString({}, { message: 'La fecha de suspension va en formato AAAA-MM-DD' })
  suspensionDesde: string;

  @ApiPropertyOptional({
    description: 'Hasta cuando se preve la suspension; se omite si es indefinida',
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
    description: 'Por que se termina antes de tiempo',
    enum: ['MUTUO_ACUERDO', 'UNILATERAL'],
  })
  @IsIn(['MUTUO_ACUERDO', 'UNILATERAL'], {
    message: 'La terminacion anticipada es por mutuo acuerdo o por decision unilateral motivada',
  })
  terminacionCausal: 'MUTUO_ACUERDO' | 'UNILATERAL';

  @ApiProperty({ description: 'Desde cuando el contrato deja de ejecutarse', example: '2026-09-30' })
  @IsDateString({}, { message: 'La fecha de terminacion va en formato AAAA-MM-DD' })
  terminacionEl: string;
}

/** Solicitud de reanudacion de una suspension vigente (EFDS-1178). */
export class SolicitarReanudacionDto extends ConJustificacion {
  @ApiProperty({ description: 'Desde cuando el contrato vuelve a correr', example: '2026-10-01' })
  @IsDateString({}, { message: 'La fecha de reanudacion va en formato AAAA-MM-DD' })
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

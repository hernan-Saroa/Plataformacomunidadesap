import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { ACCIONES_MODIFICACION, EFECTOS } from '../reglas';

// ------------------------------------------------------------- radicar --

export class CdpDeLaAdicionDto {
  @ApiProperty({ example: '12326' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  numero: string;

  @ApiProperty({ example: 15000000 })
  @IsNumber()
  @Min(1)
  valor: number;

  @ApiProperty({ example: '2026-11-20' })
  @IsDateString()
  fechaExpedicion: string;

  @ApiProperty({ example: 'A-03-03-01-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  rubro: string;
}

export class CesionarioDto {
  @ApiProperty({ example: '900123456' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  documento: string;

  @ApiProperty({ example: 'Consultores Asociados S.A.S.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  nombre: string;

  @ApiProperty({ enum: ['NATURAL', 'JURIDICA'] })
  @IsIn(['NATURAL', 'JURIDICA'])
  tipo: 'NATURAL' | 'JURIDICA';
}

/**
 * Un cambio de la modificación: el tipo del catálogo y sus datos.
 *
 * Qué datos pide depende del efecto del tipo, y lo comprueba el servicio: aquí
 * solo se valida la forma de cada campo.
 */
export class CambioDto {
  @ApiProperty({ example: 'ADICION', description: 'Código del tipo de modificación.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  tipo: string;

  @ApiPropertyOptional({ example: 15000000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  valorAdicionado?: number;

  @ApiPropertyOptional({ type: CdpDeLaAdicionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CdpDeLaAdicionDto)
  cdp?: CdpDeLaAdicionDto;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  diasProrroga?: number;

  @ApiPropertyOptional({ type: CesionarioDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CesionarioDto)
  cesionario?: CesionarioDto;

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @IsDateString()
  suspensionDesde?: string;

  @ApiPropertyOptional({ example: '2027-01-15' })
  @IsOptional()
  @IsDateString()
  suspensionHasta?: string;

  @ApiPropertyOptional({ example: '2027-01-10' })
  @IsOptional()
  @IsDateString()
  reanudadaEl?: string;

  @ApiPropertyOptional({ enum: ['MUTUO_ACUERDO', 'UNILATERAL'] })
  @IsOptional()
  @IsIn(['MUTUO_ACUERDO', 'UNILATERAL'])
  terminacionCausal?: 'MUTUO_ACUERDO' | 'UNILATERAL';

  @ApiPropertyOptional({ example: '2026-12-15' })
  @IsOptional()
  @IsDateString()
  terminacionEl?: string;

  @ApiPropertyOptional({ example: 'Modificar el anexo técnico de entregables' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;
}

export class DatosContratoAntiguoDto {
  @IsOptional() @IsString() @MaxLength(300) contratista?: string;
  @IsOptional() @IsString() objeto?: string;
  @IsOptional() @IsNumber() valor?: number;
  @IsOptional() @IsString() @MaxLength(120) plazo?: string;
  @IsOptional() @IsString() @MaxLength(200) supervisor?: string;
  @IsOptional() @IsString() @MaxLength(500) secopUrl?: string;
}

/**
 * Lo que se radica. Llega como JSON en el campo `datos` del formulario, junto
 * a un archivo por documento requerido, cuyo nombre de campo es el id del
 * requisito.
 */
export class RadicarModificacionDto {
  @ApiProperty({ example: 'CD-2026-0123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  contratoNumero: string;

  @ApiPropertyOptional({
    description:
      'El contrato de la plataforma con ese número. Con él la modificación lleva el flujo completo; sin él es una notificación. Solo se vincula al radicar.',
  })
  @IsOptional()
  @IsUUID()
  contratoId?: string;

  @ApiProperty({ type: [CambioDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CambioDto)
  cambios: CambioDto[];

  @ApiProperty({ example: 'Se requiere ampliar el alcance de los entregables por...' })
  @IsString()
  @IsNotEmpty()
  justificacion: string;

  @ApiPropertyOptional({ type: DatosContratoAntiguoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DatosContratoAntiguoDto)
  datosContrato?: DatosContratoAntiguoDto;
}

// ------------------------------------------------------------ el flujo --

export class RecibirNotificacionDto {
  @ApiPropertyOptional({ example: 'Se asignó a la abogada para tramitar por fuera.' })
  @IsOptional()
  @IsString()
  nota?: string;
}

export class AsignarModificacionDto {
  @ApiProperty({ description: 'Cuenta (id_user) del abogado.' })
  @IsString()
  @IsNotEmpty()
  abogadoId: string;

  @ApiProperty({ description: 'Cuenta (id_user) del revisor.' })
  @IsString()
  @IsNotEmpty()
  revisorId: string;
}

export class DecidirModificacionDto {
  @ApiProperty({ enum: ACCIONES_MODIFICACION })
  @IsIn(ACCIONES_MODIFICACION)
  accion: 'APROBAR' | 'DEVOLVER' | 'NEGAR';

  @ApiPropertyOptional({ description: 'Obligatorias al devolver o negar.' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class ReenviarModificacionDto {
  @ApiPropertyOptional({ example: 'Se adjunta el concepto del supervisor corregido.' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class PerfeccionarModificacionDto {
  @ApiProperty({ example: 'Modificación No. 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  numero: string;

  @ApiProperty({ example: '2026-11-25' })
  @IsDateString()
  fechaSuscripcion: string;

  @ApiPropertyOptional({ description: 'Solo si hay adición: el RP del valor adicionado.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  rpNumero?: string;

  @ApiPropertyOptional({ example: '2026-11-25' })
  @IsOptional()
  @IsDateString()
  rpFechaExpedicion?: string;
}

export class PublicarModificacionTramiteDto {
  @ApiProperty({ example: '2026-11-26' })
  @IsDateString()
  fechaPublicacion: string;

  @ApiPropertyOptional({ example: 'CO1.PCCNTR.1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  secopNumero?: string;

  @ApiPropertyOptional({ example: 'https://community.secop.gov.co/...' })
  @IsOptional()
  @IsString()
  secopUrl?: string;
}

export class CerrarModificacionDto {
  @ApiProperty({ example: 'El área ya no requiere la prórroga.' })
  @IsString()
  @IsNotEmpty()
  motivo: string;
}

// ------------------------------------------------------- configuración --

export class GuardarTipoModificacionDto {
  @ApiProperty({ example: 'REDUCCION', description: 'Se normaliza a mayúsculas sin tildes.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  codigo: string;

  @ApiProperty({ example: 'Reducción de valor' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ enum: EFECTOS })
  @IsIn(EFECTOS)
  efecto: (typeof EFECTOS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  vaSola?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

export class GuardarCadenaModificacionDto {
  @ApiProperty({
    example: [{ nombre: 'Abogado', papel: 'ABOGADO', roles: [], acciones: ['APROBAR', 'DEVOLVER'] }],
  })
  @IsArray()
  escalones: unknown[];
}

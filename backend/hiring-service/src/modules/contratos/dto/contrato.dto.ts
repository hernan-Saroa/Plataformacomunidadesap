import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Los números llegan como texto dentro del multipart: la petición lleva también
 * la minuta y `FormData` transporta todo como string. Se convierten antes de
 * validar; sin esto `IsNumber` rechazaría siempre.
 */
const aNumero = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

export class GenerarContratoDto {
  @ApiProperty({ description: 'Código de la tipología de contrato' })
  @IsString()
  @IsNotEmpty({ message: 'Elige la tipología del contrato: de ella depende el formato de la minuta' })
  @MaxLength(60)
  tipologia: string;

  @ApiProperty({ description: 'Número de contrato de la entidad, el que va en la minuta' })
  @IsString()
  @IsNotEmpty({ message: 'El contrato necesita el número con el que la entidad lo identifica' })
  @MaxLength(60)
  numero: string;

  @ApiProperty({ description: 'Objeto contractual' })
  @IsString()
  @MinLength(10, { message: 'El objeto del contrato debe describir qué se contrata' })
  objeto: string;

  @ApiProperty({ description: 'Valor del contrato en pesos' })
  @Transform(aNumero)
  @IsNumber({}, { message: 'El valor del contrato debe ser un número' })
  @IsPositive({ message: 'El valor del contrato debe ser mayor que cero' })
  valor: number;

  @ApiPropertyOptional({ description: 'Plazo de ejecución en días' })
  @IsOptional()
  @Transform(aNumero)
  @IsInt({ message: 'El plazo se expresa en días enteros' })
  @IsPositive({ message: 'El plazo debe ser mayor que cero' })
  plazoDias?: number;

  @ApiProperty({ description: 'Documento de identidad o NIT del contratista' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el documento del contratista' })
  @MaxLength(40)
  contratistaDocumento: string;

  @ApiProperty({ description: 'Nombre o razón social del contratista' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el nombre del contratista' })
  @MaxLength(300)
  contratistaNombre: string;

  /**
   * De esto depende que la legalización exija ARL (EFDS-1164, criterio 2), así
   * que se pide al contratar y no se deja para que alguien lo marque después.
   */
  @ApiProperty({ description: 'Tipo de persona del contratista', enum: ['NATURAL', 'JURIDICA'] })
  @IsIn(['NATURAL', 'JURIDICA'], {
    message: 'El contratista es persona NATURAL o JURIDICA',
  })
  contratistaTipo: 'NATURAL' | 'JURIDICA';

  @ApiPropertyOptional({ description: 'Formato del SIG del que salió la minuta' })
  @IsOptional()
  @IsUUID('4', { message: 'El formato se identifica con su id de la biblioteca' })
  plantillaId?: string;
}

export class AceptarContratoDto {
  /**
   * Quién acepta, con su nombre.
   *
   * No se toma del usuario autenticado: quien opera el sistema es el gestor de
   * la entidad, mientras que quien acepta es el proponente. Guardar el nombre
   * del gestor como aceptante haría que el expediente dijera algo falso.
   */
  @ApiProperty({ description: 'Nombre de quien acepta en representación del proponente' })
  @IsString()
  @IsNotEmpty({ message: 'Registra quién acepta el contrato en nombre del proponente' })
  @MaxLength(200)
  aceptadoPor: string;

  @ApiPropertyOptional({ description: 'Observación de la aceptación' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacion?: string;
}

export class RechazarContratoDto {
  @ApiProperty({ description: 'Nombre de quien rechaza en representación del proponente' })
  @IsString()
  @IsNotEmpty({ message: 'Registra quién rechaza el contrato en nombre del proponente' })
  @MaxLength(200)
  rechazadoPor: string;

  @ApiProperty({ description: 'Por qué el proponente no acepta la minuta' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué el proponente no acepta la minuta' })
  @MinLength(10, { message: 'El motivo debe explicar el rechazo, no una palabra suelta' })
  @MaxLength(1000)
  motivo: string;
}

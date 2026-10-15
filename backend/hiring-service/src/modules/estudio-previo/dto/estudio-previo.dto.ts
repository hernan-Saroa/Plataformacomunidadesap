import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/**
 * Lo que pide la API para crear un proceso: la línea del PAA de la que nace.
 *
 * El objeto, la modalidad y el valor ya no los teclea nadie: salen de la línea
 * (migración 097). Quien crea elige región, vigencia y línea; el resto lo dice
 * el PAA, y lo que se corrija después se corrige en la 3.1.
 */
export class CrearProcesoDesdePaaDto {
  @ApiProperty({ description: 'Línea del PAA, de la versión activa de la vigencia vigente' })
  @IsUUID('4', { message: 'Hay que elegir una línea del Plan Anual de Adquisiciones' })
  paaLineaId: string;
}

/**
 * Los datos con los que nace un proceso.
 *
 * Ya no es el cuerpo de ninguna petición: la API crea desde una línea del PAA
 * (`CrearProcesoDesdePaaDto`) y de ella saca estos tres. Se conserva porque es
 * lo que la creación necesita por dentro, y las pruebas e2e de las etapas
 * siguientes arman sus procesos así, sin PAA de por medio.
 */
export class CrearProcesoDto {
  @ApiProperty({ description: 'Objeto a contratar', example: 'Adquisición de 50 equipos de cómputo' })
  @IsString()
  @IsNotEmpty({ message: 'El objeto del proceso es obligatorio' })
  @MaxLength(4000)
  objeto: string;

  /**
   * La matriz de flujo marca SI/NO por modalidad en cada actividad, así que sin
   * este dato no se sabe cuáles aplican al proceso. El código se valida contra
   * hiring.modalidades, no con un enum: el catálogo cambia con la normativa.
   */
  @ApiProperty({ description: 'Código de la modalidad de selección', example: 'MINIMA_CUANTIA' })
  @IsString()
  @IsNotEmpty({ message: 'La modalidad de selección es obligatoria' })
  @MaxLength(60)
  modalidad: string;

  /**
   * Se pide al crear y no en el estudio previo porque de él depende la
   * modalidad aplicable por cuantía (EFDS-1147).
   */
  @ApiProperty({ description: 'Valor estimado del contrato en pesos', example: 45000000 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor estimado debe ser un número' })
  @Min(0, { message: 'El valor estimado no puede ser negativo' })
  valorEstimado: number;
}

export class GuardarBorradorDto {
  @ApiProperty({
    description: 'Valores del formulario. Solo se aceptan códigos definidos en campos_formulario.',
    example: { objeto_contratar: 'Adquisición de equipos', valor_estimado: 78500000 },
  })
  @IsObject()
  datos: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Versión leída por el cliente. Si no coincide con la almacenada se responde 409 ' +
      'para no pisar cambios de otra sesión.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}

/** La modalidad que el área elige mientras arma el estudio previo. */
export class CambiarModalidadDto {
  @ApiProperty({ description: 'Código de la modalidad del catálogo' })
  @IsString()
  @IsNotEmpty({ message: 'Elige la modalidad de contratación' })
  @MaxLength(60)
  modalidad: string;
}

/**
 * Borrar un proceso (108): el radicado escrito a mano y el motivo.
 *
 * El radicado confirma que se borra el que se quiere borrar; el motivo es lo
 * único que queda, en el log, porque la trazabilidad se va con el proceso.
 */
export class BorrarProcesoDto {
  @ApiProperty({ description: 'El radicado del proceso, escrito tal cual', example: 'CTO-2026-11691' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe el radicado del proceso para confirmar' })
  @MaxLength(60)
  radicado: string;

  @ApiProperty({ description: 'Por qué se borra', example: 'Proceso de prueba' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo es obligatorio: es lo único que queda del proceso' })
  @MaxLength(1000)
  motivo: string;
}

export class RevisarDto {
  @ApiPropertyOptional({
    description:
      'Observaciones del revisor. Obligatorias al devolver: sin motivo el gestor ' +
      'no sabe qué corregir.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;

  /**
   * Solo al aprobar y solo si la 3.4 quedó configurada con `EXIGE_FIRMA`
   * (EFDS-2070). Es la firma de quien aprueba, distinta de la de quien envió
   * la 3.1.
   */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

/** Lo que acompaña el envío del estudio previo a revisión. */
export class EnviarEstudioPrevioDto {
  /** Solo si la 3.1 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

/**
 * El consecutivo con el que el área remitió el paquete a la Dirección.
 *
 * Opcional, y no por descuido: el procedimiento admite remitir «por correo
 * electrónico o mediante carpeta compartida», y solo una de esas vías genera
 * radicado en Active Document. Mandarlo vacío lo borra, para poder corregir
 * un número anotado por equivocación.
 */
export class AnotarRadicadoDto {
  @ApiPropertyOptional({
    description: 'Consecutivo de Active Document; vacío si no hubo',
    example: '2026-EE-004512',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  radicado?: string;
}

/** Campo que falta al intentar enviar (criterio 2 del HU). */
export class CampoFaltanteDto {
  @ApiProperty() codigo: string;
  @ApiProperty() etiqueta: string;
  @ApiPropertyOptional() grupo?: string;
}

/** Por qué el área retira el CDP que gestionó desde el estudio previo. */
export class RetirarCdpDto {
  @ApiPropertyOptional({ description: 'Motivo del retiro' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}

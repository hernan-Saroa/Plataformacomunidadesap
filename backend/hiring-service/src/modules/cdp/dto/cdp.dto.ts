import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SolicitarCdpDto {
  /**
   * Opcional desde que la solicitud nace sola al cerrarse la etapa 3.
   *
   * El estudio previo no captura el rubro —la migración 006 lo dejó fuera de
   * sus metadatos— y quien sabe de qué rubro sale la plata es la Dirección
   * Financiera, que lo registra al expedir. Se sigue aceptando porque un área
   * que lo conozca puede adelantarlo, y porque las solicitudes radicadas a mano
   * antes de esto lo traían.
   */
  @ApiPropertyOptional({
    description: 'Rubro presupuestal contra el que se solicita, si el área lo conoce',
    example: 'A-02-02-02-008',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  rubro?: string;

  /**
   * Se pide aunque el valor definitivo lo fije la Financiera al expedir: sin
   * una cifra, la verificación de disponibilidad no tiene contra qué mirar.
   */
  @ApiProperty({ description: 'Valor que se solicita respaldar, en pesos', example: 45000000 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor debe ser un número' })
  @Min(1, { message: 'El valor solicitado debe ser mayor que cero' })
  valor: number;

  @ApiPropertyOptional({ description: 'Vigencia fiscal a la que se imputa', example: 2026 })
  @IsOptional()
  @IsInt({ message: 'La vigencia debe ser un año' })
  @Min(2000)
  vigenciaFiscal?: number;

  @ApiPropertyOptional({ description: 'Observaciones de la solicitud' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}

/**
 * Lo que la Financiera afirma al verificar la disponibilidad (4.2).
 *
 * El rubro y no un «sí»: hasta la 073 la verificación era un botón, y en el
 * expediente quedaba quién confirmó y cuándo, pero no contra qué. Sin el rubro
 * la afirmación no se puede comprobar contra la ejecución presupuestal, que es
 * justamente lo que un ente de control vendría a mirar.
 *
 * Opcional aquí y obligatorio en el servicio solo si el CDP no lo trae ya: un
 * área que conociera el rubro pudo adelantarlo al radicar, y volver a pedirlo
 * sería pedir dos veces el mismo dato.
 */
export class VerificarCdpDto {
  @ApiPropertyOptional({
    description: 'Rubro presupuestal contra el que se verifica. Obligatorio si la solicitud no lo trae.',
    example: 'A-02-02-02-008',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  rubro?: string;
}

export class ExpedirCdpDto {
  /**
   * Para corregir, no para volver a pedirlo.
   *
   * El rubro llega de la verificación; se acepta aquí porque al buscar el saldo
   * la Financiera puede acabar imputando a otro. Si no se manda, se conserva el
   * que se verificó: omitirlo no es borrarlo.
   */
  @ApiPropertyOptional({
    description: 'Rubro efectivamente afectado, si difiere del verificado',
    example: 'A-02-02-02-008',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  rubro?: string;

  @ApiProperty({ description: 'Número del CDP asignado por la Dirección Financiera', example: 'CDP-2026-0451' })
  @IsString()
  @IsNotEmpty({ message: 'El número del CDP es obligatorio' })
  @MaxLength(60)
  numero: string;

  @ApiProperty({ description: 'Valor efectivamente certificado, en pesos', example: 45000000 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor debe ser un número' })
  @Min(1, { message: 'El valor del CDP debe ser mayor que cero' })
  valor: number;

  @ApiProperty({ description: 'Fecha de expedición (YYYY-MM-DD)', example: '2026-08-06' })
  @IsISO8601({ strict: true }, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaExpedicion: string;

  @ApiPropertyOptional({ description: 'Vigencia fiscal a la que se imputa', example: 2026 })
  @IsOptional()
  @IsInt()
  @Min(2000)
  vigenciaFiscal?: number;
}

export class RechazarCdpDto {
  /**
   * Obligatorio: sin motivo, el área solicitante no sabe si corregir el rubro,
   * esperar a la siguiente vigencia o reducir el alcance del proceso.
   */
  @ApiProperty({ description: 'Motivo del rechazo' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo del rechazo es obligatorio' })
  observaciones: string;
}

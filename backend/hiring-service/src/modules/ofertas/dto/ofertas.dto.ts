import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class FijarPlazoOfertasDto {
  /**
   * Con hora, no solo el día.
   *
   * Las ofertas se reciben "hasta las 10:00 a.m. del día X", y de la hora
   * depende si la radicada esa misma mañana llegó a tiempo. Se pide en ISO 8601
   * con zona (`2026-09-01T10:00:00-05:00`) para que no dependa de la zona del
   * servidor: un plazo corrido cinco horas es un término legal incumplido.
   */
  @ApiProperty({
    description: 'Fecha y hora hasta la que se reciben ofertas, en ISO 8601 con zona',
    example: '2026-09-01T10:00:00-05:00',
  })
  @IsISO8601(
    { strict: true },
    { message: 'El vencimiento debe llevar fecha y hora en ISO 8601, por ejemplo 2026-09-01T10:00:00-05:00' },
  )
  vencimiento: string;
}

export class RegistrarOferenteDto {
  @ApiProperty({ description: 'Nombre o razón social del oferente' })
  @IsString()
  @IsNotEmpty({ message: 'Indica el nombre o la razón social del oferente' })
  @MinLength(3, { message: 'El nombre del oferente no puede ser una sigla suelta' })
  @MaxLength(200)
  nombre: string;

  @ApiProperty({ description: 'NIT o documento de identidad del oferente' })
  @IsString()
  @IsNotEmpty({ message: 'Indica el NIT o documento del oferente' })
  @MaxLength(40)
  identificacion: string;

  /**
   * La de radicación ante la entidad, no la del registro en la plataforma.
   *
   * No hay integración con SECOP II ni está prevista: el gestor transcribe
   * cuándo llegó la oferta, y esa hora es la que se compara con el vencimiento.
   */
  @ApiProperty({
    description: 'Fecha y hora en que se radicó la oferta, en ISO 8601 con zona',
    example: '2026-09-01T09:35:00-05:00',
  })
  @IsISO8601(
    { strict: true },
    { message: 'La radicación debe llevar fecha y hora en ISO 8601, por ejemplo 2026-09-01T09:35:00-05:00' },
  )
  fechaRadicacion: string;

  /**
   * Valor de la oferta tal como se presentó.
   *
   * Opcional a propósito: no todas las modalidades califican precio, y una
   * oferta ya recibida no se puede rechazar por un dato que la actividad 6.1 no
   * pedía cuando se registró.
   */
  @ApiPropertyOptional({ description: 'Valor de la oferta presentada', example: 45000000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor de la oferta debe ser un número' })
  @Min(0, { message: 'El valor de la oferta no puede ser negativo' })
  valorOfertado?: number;
}

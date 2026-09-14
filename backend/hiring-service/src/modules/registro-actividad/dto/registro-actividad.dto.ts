import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistrarActividadDto {
  /**
   * Cuándo ocurrió el hecho, no cuándo se digita.
   *
   * El sorteo se hace un día y se transcribe otro, y la alerta de la 5.9 se
   * cuenta contra el cronograma del proceso.
   */
  @ApiProperty({ description: 'Fecha en que ocurrió la actividad', example: '2026-08-27' })
  @IsISO8601({ strict: true }, { message: 'La fecha va en formato AAAA-MM-DD' })
  fecha: string;

  /**
   * La nota de trazabilidad que pide la matriz.
   *
   * Con largo mínimo porque es lo único que explica qué pasó por fuera de la
   * plataforma: un "ok" deja el expediente sin decir nada.
   */
  @ApiProperty({ description: 'Nota de trazabilidad de lo que ocurrió' })
  @IsString()
  @IsNotEmpty({ message: 'La nota de trazabilidad es obligatoria' })
  @MinLength(10, { message: 'La nota debe explicar qué pasó, no solo dejar constancia' })
  @MaxLength(4000)
  nota: string;

  /**
   * Lo propio de cada actividad: el sí/no del sorteo, el consecutivo de Active
   * Document en la 3.3. Abierto porque son once actividades distintas y ninguna
   * de estas anotaciones gobierna una regla.
   */
  @ApiPropertyOptional({ description: 'Datos propios de la actividad' })
  @IsOptional()
  @IsObject()
  datos?: Record<string, any>;
}

export class AnularRegistroDto {
  @ApiProperty({ description: 'Por qué se anula el registro' })
  @IsString()
  @IsNotEmpty({ message: 'Di por qué se anula el registro' })
  @MinLength(10, { message: 'El motivo debe explicar la corrección' })
  @MaxLength(2000)
  motivo: string;
}

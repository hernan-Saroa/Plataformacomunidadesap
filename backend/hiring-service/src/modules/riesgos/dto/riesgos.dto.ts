import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegistrarAudienciaDto {
  /**
   * La de celebración, no la del registro: es el hecho que documenta la matriz
   * de riesgos, y de él depende que el proceso pueda abrirse.
   */
  @ApiProperty({ description: 'Fecha en que se celebró la audiencia (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de la audiencia debe tener el formato YYYY-MM-DD' })
  fechaCelebracion: string;

  @ApiPropertyOptional({ description: 'Observaciones o acuerdos relevantes de la audiencia' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;
}

export class AnularAudienciaDto {
  /**
   * Anular deja el proceso sin audiencia vigente y, donde es obligatoria,
   * vuelve a bloquear la apertura. El motivo es lo que explica ese retroceso a
   * quien revise el expediente después.
   */
  @ApiProperty({ description: 'Por qué se anula la audiencia registrada' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se anula la audiencia' })
  @MinLength(10, { message: 'El motivo debe explicar la anulación, no una palabra suelta' })
  @MaxLength(1000)
  motivo: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EnviarPresupuestoDto {
  @ApiPropertyOptional({
    description: 'Observaciones o notas adicionales del analista al remitir el paquete a Presupuesto.',
    example: 'Paquete completo con liquidación y visto bueno de Subdirección para expedición de RP.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observaciones?: string;
}

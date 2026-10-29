import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Una plantilla de cadena tal como llega de Configuración.
 *
 * Los escalones se validan en el servicio con `validarEscalones` y no aquí:
 * quien configura necesita ver todo lo que falta de una vez, en frases, y no
 * el primer error de un decorador.
 */
export class GuardarCadenaDto {
  @ApiProperty({ example: 'Técnico, coordinador y director' })
  @IsString()
  @MaxLength(160)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @ApiProperty({
    description:
      'Los escalones en orden: { nombre, roles, personas (id_person), papeles, reglaDecision: UNO|TODOS, acciones: APROBAR|DEVOLVER|NEGAR }',
    example: [
      { nombre: 'Revisión jurídica', roles: ['ABOGADO_REVISOR'], acciones: ['APROBAR', 'DEVOLVER'] },
      { nombre: 'Directora', roles: ['DIRECTORA_DE_CONTRATACION'], acciones: ['APROBAR', 'DEVOLVER', 'NEGAR'] },
    ],
  })
  @IsArray()
  escalones: unknown[];

  @ApiPropertyOptional({
    description: 'Si una misma persona puede aprobar dos escalones de la misma ronda. Por defecto no.',
  })
  @IsOptional()
  @IsBoolean()
  permiteMismoAprobador?: boolean;
}

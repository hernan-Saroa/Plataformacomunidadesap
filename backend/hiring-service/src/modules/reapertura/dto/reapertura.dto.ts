import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReabrirActividadesDto {
  @ApiProperty({ description: 'Los numerales que se reabren', example: ['3.1', '4.2'] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Elige al menos una actividad para reabrir' })
  @ArrayMaxSize(80)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  numerales: string[];

  @ApiProperty({ description: 'Qué hay que corregir', example: 'El NIT del contratista quedó mal digitado' })
  @IsString()
  @IsNotEmpty({ message: 'Explica qué hay que corregir' })
  @MaxLength(2000)
  motivo: string;
}

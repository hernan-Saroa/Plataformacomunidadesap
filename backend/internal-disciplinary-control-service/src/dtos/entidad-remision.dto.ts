import { IsString, IsEmail, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateEntidadRemisionDto {
  @ApiProperty({ description: 'Nombre de la entidad de remisión' })
  @IsString()
  nombre: string;

  @ApiProperty({ description: 'Correo electrónico de la entidad' })
  @IsEmail()
  correo: string;
}

export class UpdateEntidadRemisionDto extends PartialType(CreateEntidadRemisionDto) {
  @ApiProperty({ description: 'ID de la entidad', required: true })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Si la entidad está activa' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

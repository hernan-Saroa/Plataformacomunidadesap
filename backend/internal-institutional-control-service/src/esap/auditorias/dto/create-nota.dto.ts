import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  IsInt,
} from 'class-validator';
import { CategoriaNota } from '../entities/nota-auditoria.entity';

export class CreateNotaDto {
  @IsString()
  @IsNotEmpty()
  contenido: string;

  @IsEnum(CategoriaNota)
  @IsNotEmpty()
  categoria: CategoriaNota;

  @IsBoolean()
  @IsOptional()
  importante?: boolean;

  @IsInt()
  @IsOptional()
  autorId?: number; // Si no se proporciona, se obtendrá del contexto de autenticación
}


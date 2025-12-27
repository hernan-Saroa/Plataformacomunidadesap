import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { CategoriaNota } from '../entities/nota-auditoria.entity';

export class UpdateNotaDto {
  @IsString()
  @IsOptional()
  contenido?: string;

  @IsEnum(CategoriaNota)
  @IsOptional()
  categoria?: CategoriaNota;

  @IsBoolean()
  @IsOptional()
  importante?: boolean;
}


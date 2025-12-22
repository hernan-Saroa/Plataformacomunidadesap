import {
  IsString,
  IsEnum,
  IsEmail,
  IsOptional,
  IsObject,
  ValidateNested,
  IsUUID,
  IsArray,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { NewsOrigin } from '../entities/disciplinary-news.entity';

export class PersonInfoDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  cedula?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  dependencia?: string;

  @IsOptional()
  @IsString()
  entidad?: string;
}

export class CreateDisciplinaryNewsDto {
  @IsEnum(NewsOrigin)
  origen: NewsOrigin;

  @IsOptional()
  @IsDateString()
  fechaQueja?: string;

  @IsString()
  territorial: string;

  @IsString()
  dependenciaDenunciado: string;

  @IsOptional()
  @IsObject()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  })
  denunciante: PersonInfoDto;

  @IsOptional()
  @IsObject()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  })
  disciplinable: PersonInfoDto;

  @IsString()
  hechos: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conductas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adjuntos?: string[];
}

export class DisciplinaryNewsResponseDto {
  id: string;
  radicado: string;
  fechaRecepcion: Date;
  fechaQueja?: Date;
  origen: string;
  territorial: string;
  dependenciaDenunciado: string;
  denunciante: object;
  disciplinable: object;
  hechos: string;
  conductas?: string[];
  estado: string;
  adjuntos: string[];
  updatedAt: Date;
}

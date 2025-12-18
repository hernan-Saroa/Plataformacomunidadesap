import {
  IsString,
  IsEnum,
  IsEmail,
  IsOptional,
  IsObject,
  ValidateNested,
  IsUUID,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
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
}

export class CreateDisciplinaryNewsDto {
  @IsEnum(NewsOrigin)
  origen: NewsOrigin;

  @IsString()
  territorial: string;

  @IsString()
  dependenciaDenunciado: string;

  @ValidateNested()
  @Type(() => PersonInfoDto)
  denunciante: PersonInfoDto;

  @ValidateNested()
  @Type(() => PersonInfoDto)
  disciplinable: PersonInfoDto;

  @IsString()
  hechos: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adjuntos?: string[];
}

export class DisciplinaryNewsResponseDto {
  id: string;
  radicado: string;
  fechaRecepcion: Date;
  origen: string;
  territorial: string;
  dependenciaDenunciado: string;
  denunciante: object;
  disciplinable: object;
  hechos: string;
  estado: string;
  adjuntos: string[];
  updatedAt: Date;
}

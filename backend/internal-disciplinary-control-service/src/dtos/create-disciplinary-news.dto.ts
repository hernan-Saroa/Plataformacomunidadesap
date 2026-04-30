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
import { Type, Transform, plainToInstance } from 'class-transformer';
import { NewsOrigin } from '../entities/disciplinary-news.entity';

const toPersonInfoDto = (value: unknown): PersonInfoDto | null => {
  if (typeof value === 'string') {
    try {
      return plainToInstance(PersonInfoDto, JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (value && typeof value === 'object') {
    return plainToInstance(PersonInfoDto, value);
  }

  return null;
};

export class ApoderadoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  cedula?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}

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

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ApoderadoDto)
  apoderado?: ApoderadoDto;
}

export class CreateDisciplinaryNewsDto {
  @IsEnum(NewsOrigin)
  origen: NewsOrigin;

  @IsOptional()
  @IsDateString()
  fechaQueja?: string;

  @IsOptional()
  @IsDateString()
  fechaHechos?: string;

  @IsString()
  territorial: string;

  @IsString()
  conducta?: string;

  @IsOptional()
  @IsUUID()
  radicadorId?: string;

  @IsString()
  dependenciaDenunciado: string;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = typeof value === 'string' ? (() => { try { return JSON.parse(value); } catch { return null; } })() : value;
    if (!parsed) return null;
    if (Array.isArray(parsed)) return parsed.map((item: unknown) => plainToInstance(PersonInfoDto, item));
    return plainToInstance(PersonInfoDto, parsed);
  })
  denunciante: PersonInfoDto | PersonInfoDto[];

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = typeof value === 'string' ? (() => { try { return JSON.parse(value); } catch { return null; } })() : value;
    if (!parsed) return null;
    if (Array.isArray(parsed)) return parsed.map((item: unknown) => plainToInstance(PersonInfoDto, item));
    return plainToInstance(PersonInfoDto, parsed);
  })
  disciplinable: PersonInfoDto | PersonInfoDto[];

    @IsString()
    hechos: string;

  
    

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    conductas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }
    return value;
  })
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
   conducta?: string;
   conductas?: string[];
   estado: string;
  adjuntos: string[];
  radicadorId?: string;
  updatedAt: Date;
}

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
  @Transform(({ value }) => {
    if (!value) return NewsOrigin.POR_DETERMINAR;
    if (typeof value === 'string') {
      const s = value.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (s.includes('ANONIM')) return NewsOrigin.ANONIMO;
      if (s.includes('QUEJ') || s.includes('INFORMANT')) return NewsOrigin.QUEJOSO;
      if (s.includes('OFICIO')) return NewsOrigin.OFICIO;
      if (s.includes('REMISI') || s.includes('COMPETENC')) return NewsOrigin.REMISION;
      if (s.includes('DETERMINAR')) return NewsOrigin.POR_DETERMINAR;
    }
    return value;
  })
  origen: NewsOrigin;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return value;
  })
  fechaQueja?: string;

  @IsOptional()
  @IsDateString({ strict: false })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') {
      // Si viene como date-only (YYYY-MM-DD), convertir a ISO para el validador
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value + 'T00:00:00.000Z';
      }
      return value;
    }
    return value;
  })
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

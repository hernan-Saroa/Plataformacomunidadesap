import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CATEGORIAS_CENTRO_AYUDA,
  type CategoriaCentroAyuda,
} from '../centro-ayuda-recurso.entity';

// El formulario llega como multipart: todo viene como texto.
const aTexto = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const aEntero = ({ value }: { value: unknown }) =>
  value === '' || value === undefined || value === null ? undefined : Number(value);
const aBooleano = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
};

export class GuardarRecursoDto {
  @Transform(aTexto)
  @IsIn(CATEGORIAS_CENTRO_AYUDA as unknown as string[], {
    message: 'La categoría no es válida',
  })
  categoria: CategoriaCentroAyuda;

  @Transform(aTexto)
  @IsString()
  @MaxLength(200, { message: 'El título no puede superar 200 caracteres' })
  titulo: string;

  @IsOptional()
  @Transform(aTexto)
  @IsString()
  descripcion?: string;

  @IsOptional()
  @Transform(aTexto)
  @IsString()
  @MaxLength(100)
  modulo?: string;

  @IsOptional()
  @Transform(aTexto)
  @IsString()
  contenido?: string;

  @IsOptional()
  @Transform(aTexto)
  @IsString()
  enlace?: string;

  @IsOptional()
  @Transform(aTexto)
  @IsString()
  @MaxLength(30)
  version?: string;

  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  @Min(0)
  orden?: number;

  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  activo?: boolean;

  /** En la edición, quita el archivo que tenía el recurso. */
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  quitarArchivo?: boolean;
}

import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ICONOS_SECCION,
  TIPOS_SECCION,
  type IconoSeccion,
  type TipoSeccion,
} from '../centro-ayuda-seccion.entity';

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
  @Transform(aEntero)
  @IsInt({ message: 'Elija la sección del recurso' })
  idSeccion: number;

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

export class GuardarSeccionDto {
  @Transform(aTexto)
  @IsString()
  @IsNotEmpty({ message: 'Escriba el nombre de la sección' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  nombre: string;

  @IsOptional()
  @Transform(aTexto)
  @IsString()
  @MaxLength(300, { message: 'La descripción no puede superar 300 caracteres' })
  descripcion?: string;

  @Transform(aTexto)
  @IsIn(ICONOS_SECCION as unknown as string[], { message: 'El icono no es válido' })
  icono: IconoSeccion;

  @Transform(aTexto)
  @IsIn(TIPOS_SECCION as unknown as string[], { message: 'El tipo de sección no es válido' })
  tipo: TipoSeccion;

  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  activo?: boolean;
}

/** Ids de las secciones en el orden en que deben mostrarse. */
export class OrdenarSeccionesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];
}

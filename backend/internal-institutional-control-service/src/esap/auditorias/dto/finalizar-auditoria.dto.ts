import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para el documento de cierre de auditoría
 */
export class DocumentoCierreDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del documento es obligatorio' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'La URL del documento es obligatoria' })
  url: string;

  @IsString()
  @IsNotEmpty({ message: 'El tipo de documento es obligatorio' })
  tipo: string;

  @IsNumber()
  @IsNotEmpty({ message: 'El tamaño del documento es obligatorio' })
  tamano: number;

  @IsString()
  @IsNotEmpty({ message: 'La fecha de carga es obligatoria' })
  fechaCarga: string;

  @IsString()
  @IsOptional()
  cargadoPor?: string;
}

/**
 * DTO para finalizar una auditoría
 * Requiere obligatoriamente el documento de cierre (matriz/formato)
 */
export class FinalizarAuditoriaDto {
  @ValidateNested()
  @Type(() => DocumentoCierreDto)
  @IsNotEmpty({ message: 'El documento de cierre es obligatorio para finalizar la auditoría' })
  documentoCierre: DocumentoCierreDto;

  @IsString()
  @IsOptional()
  observacionesCierre?: string;

  @IsString()
  @IsOptional()
  finalizadaPor?: string;

  @IsNumber()
  @IsOptional()
  finalizadaPorId?: number;
}

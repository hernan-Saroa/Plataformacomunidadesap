import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { TipoDocumentoEvidencia } from '../entities/evidencia-documento.entity';

export class CreateEvidenciaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsEnum(TipoDocumentoEvidencia)
  tipoDocumento: TipoDocumentoEvidencia;

  // Solo una de estas debe estar presente
  @IsUUID()
  @IsOptional()
  hallazgoId?: string;

  @IsUUID()
  @IsOptional()
  accionCorrectivaId?: string;

  @IsUUID()
  @IsOptional()
  planMejoramientoId?: string;

  @IsUUID()
  @IsOptional()
  auditoriaId?: string;
}

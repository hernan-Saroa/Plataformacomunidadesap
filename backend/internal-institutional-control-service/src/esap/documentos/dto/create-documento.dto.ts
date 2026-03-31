import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID, IsNumber, Min } from 'class-validator';
import { TipoDocumento, EtapaDocumento } from '../entities/documento.entity';

export class CreateDocumentoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsEnum(TipoDocumento)
  @IsNotEmpty()
  tipoDocumento: TipoDocumento;

  @IsOptional()
  @IsEnum(EtapaDocumento)
  etapa?: EtapaDocumento;

  @IsOptional()
  @IsUUID()
  auditoriaId?: string;

  @IsOptional()
  @IsUUID()
  hallazgoId?: string;

  @IsOptional()
  @IsUUID()
  planMejoramientoId?: string;

  @IsOptional()
  @IsUUID()
  documentoBibliotecaId?: string;

  @IsOptional()
  @IsUUID()
  visibleAuditoriaId?: string;

  @IsString()
  @IsNotEmpty()
  nombreArchivo: string;

  @IsString()
  @IsNotEmpty()
  tipoMime: string;

  @IsNumber()
  @Min(0)
  tamanioBytes: number;

  @IsString()
  @IsNotEmpty()
  subidoPor: string;

  @IsOptional()
  @IsString()
  hashArchivo?: string;
}


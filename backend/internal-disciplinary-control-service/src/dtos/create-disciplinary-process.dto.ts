import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class CreateDisciplinaryProcessDto {
  @IsString()
  newsId: string;

  @IsString()
  abogadoId: string;

  @IsOptional()
  @IsString()
  abogadoNombre?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateProcessStageDto {
  @IsUUID()
  nuevaEtapaId: string; // Stage configuration ID

  @IsNotEmpty()
  @IsString()
  justificacion: string;
}

export class DisciplinaryProcessResponseDto {
  id: string;
  radicadoProceso: string;
  newsId: string;
  abogadoAsignadoId: string;
  etapaActual: string;
  estado: string;
  fechaPrescripcion: Date;
  fechaVencimientoEtapa: Date;
  observaciones: string;
  createdAt: Date;
  updatedAt: Date;
}

import { IsString, IsOptional, IsIn } from 'class-validator';

export class RegistrarReunionDto {
  @IsString()
  fecha: string;

  @IsString()
  hora: string;

  @IsString()
  @IsIn(['presencial', 'virtual', 'hibrida'])
  modalidad: 'presencial' | 'virtual' | 'hibrida';

  @IsOptional()
  @IsString()
  lugar?: string;

  @IsOptional()
  @IsString()
  participantes?: string;

  @IsOptional()
  @IsString()
  temasTratados?: string;

  @IsOptional()
  @IsString()
  elaboradoPor?: string;

  @IsOptional()
  @IsString()
  revisadoPor?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  actaBibliotecaId?: string;
}

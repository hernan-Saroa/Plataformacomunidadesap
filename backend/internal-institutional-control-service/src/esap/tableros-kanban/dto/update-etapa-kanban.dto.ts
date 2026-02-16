import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, Min } from 'class-validator';
import { EstadoEtapa } from '../entities/etapa-kanban.entity';

export class UpdateEtapaKanbanDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  orden?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  tiempoSLA?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limiteWIP?: number | null;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsBoolean()
  notificarVencimiento?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  diasAnticipacionAlerta?: number;

  @IsOptional()
  @IsEnum(EstadoEtapa)
  estado?: EstadoEtapa;

  @IsOptional()
  @IsBoolean()
  permitirRetroceso?: boolean;
}


import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, Min, Max } from 'class-validator';
import { EstadoEtapa } from '../entities/etapa-kanban.entity';

export class CreateEtapaKanbanDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsInt()
  @Min(1)
  orden: number;

  @IsString()
  color: string; // Hex color

  @IsInt()
  @Min(0)
  tiempoSLA: number; // días

  @IsOptional()
  @IsInt()
  @Min(1)
  limiteWIP?: number | null; // null = sin límite

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

  @IsEnum(EstadoEtapa)
  estado: EstadoEtapa;

  @IsOptional()
  @IsBoolean()
  permitirRetroceso?: boolean;
}


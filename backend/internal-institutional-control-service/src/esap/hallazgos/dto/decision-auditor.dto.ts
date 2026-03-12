import { IsIn, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class DecisionAuditorDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['ratificado', 'modificado', 'retirado'])
  tipoDecision: 'ratificado' | 'modificado' | 'retirado';

  @IsString()
  @IsNotEmpty()
  fundamentacionTecnica: string;

  @IsOptional()
  @IsNumber()
  auditorId?: number;
}

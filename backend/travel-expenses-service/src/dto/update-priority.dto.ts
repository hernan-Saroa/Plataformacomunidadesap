import { IsString, IsIn, IsOptional } from 'class-validator';

export class UpdatePriorityDto {
  @IsString()
  @IsIn(['ALTA', 'MEDIA', 'BAJA'])
  prioridad: string;
}

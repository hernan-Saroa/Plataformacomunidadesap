import { IsOptional, IsNumber } from 'class-validator';

export class UpdateNewsKanbanDto {
  @IsOptional()
  @IsNumber()
  kanbanStage?: number;
}

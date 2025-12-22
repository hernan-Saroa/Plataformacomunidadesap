import { IsOptional, IsString } from 'class-validator';

export class UpdateNewsKanbanDto {
  @IsOptional()
  @IsString()
  kanbanStage?: string;
}

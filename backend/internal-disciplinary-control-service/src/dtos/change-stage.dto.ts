import { IsOptional, IsString } from 'class-validator';

export class ChangeStageDto {
    @IsString()
    stageId: string;

    @IsOptional()
    @IsString()
    kanbanNotice?: string;
}

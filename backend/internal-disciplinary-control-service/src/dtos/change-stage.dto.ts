import { IsUUID, IsOptional, IsString } from 'class-validator';

export class ChangeStageDto {
    @IsUUID()
    stageId: string; // Stage configuration ID

    @IsOptional()
    @IsString()
    kanbanNotice?: string;
}

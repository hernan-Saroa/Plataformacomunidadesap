import { IsOptional, IsString } from 'class-validator';

export class ResubmitNewsDto {
    @IsOptional()
    @IsString()
    observaciones?: string;
}

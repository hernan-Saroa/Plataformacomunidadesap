import { IsNotEmpty, IsString } from 'class-validator';

export class ReturnNewsDto {
    @IsString()
    @IsNotEmpty()
    observaciones: string;
}

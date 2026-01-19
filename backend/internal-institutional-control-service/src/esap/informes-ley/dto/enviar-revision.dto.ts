import { IsOptional, IsString } from 'class-validator';

export class EnviarRevisionDto {
  @IsOptional()
  @IsString()
  observaciones?: string;
}

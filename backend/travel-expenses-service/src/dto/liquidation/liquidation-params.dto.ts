import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateLiquidationParamsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  smmlv?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  factorContratista?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  factorSinPernocta?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cacheTtlMinutes?: number;
}

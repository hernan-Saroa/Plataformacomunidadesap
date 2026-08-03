import { IsString, IsBoolean, IsOptional, IsNumber, IsIn } from 'class-validator';

export class UpdateModuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsNumber()
  display_order?: number;

  @IsOptional()
  @IsIn(['backoffice', 'portal'])
  category?: 'backoffice' | 'portal';

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

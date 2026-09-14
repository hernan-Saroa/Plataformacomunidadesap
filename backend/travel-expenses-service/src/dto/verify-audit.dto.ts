import { IsBoolean, IsOptional } from 'class-validator';

export class VerifyAuditDto {
  @IsBoolean()
  @IsOptional()
  seguridadSocialVigente?: boolean;

  @IsBoolean()
  @IsOptional()
  consultaRutFacturador?: boolean;
}

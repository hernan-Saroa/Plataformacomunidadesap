import { IsBoolean } from 'class-validator';

export class UpdateLoginSettingsDto {
  @IsBoolean()
  credentialLoginEnabled: boolean;
}

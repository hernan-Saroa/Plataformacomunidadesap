import { IsEmail, IsString } from 'class-validator';

export class MicrosoftLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  idToken: string;
}


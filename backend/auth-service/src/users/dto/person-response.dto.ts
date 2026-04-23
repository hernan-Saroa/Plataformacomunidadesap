import { Expose, Type } from 'class-transformer';

export class RoleResponseDto {
  @Expose()
  id: string;

  @Expose()
  code: string;

  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  icon: string;

  @Expose()
  color: string;

  @Expose()
  type: string;

  @Expose()
  is_active: boolean;

  @Expose()
  requires_2fa: boolean;
}

export class UserResponseDto {
  @Expose()
  id_user: string;

  @Expose()
  public_id: string;

  @Expose()
  username: string;

  @Expose()
  is_active: boolean;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;

  @Expose()
  @Type(() => RoleResponseDto)
  roles?: RoleResponseDto[];
}

export class PersonResponseDto {
  @Expose()
  id: string;

  @Expose()
  identification_number: string;

  @Expose()
  identification_type: string;

  @Expose()
  full_name: string;

  @Expose()
  first_name: string;

  @Expose()
  last_name: string;

  @Expose()
  gender: string;

  @Expose()
  email: string;

  @Expose()
  phone: string;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;

  @Expose()
  @Type(() => UserResponseDto)
  user?: UserResponseDto;
}

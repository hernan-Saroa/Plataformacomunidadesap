import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  IsBoolean,
} from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  method: string;

  @IsString()
  url: string;

  @IsString()
  path: string;

  @IsOptional()
  @IsObject()
  queryParams?: any;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  submodule?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  referer?: string;

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsString()
  userEmail?: string;

  @IsOptional()
  @IsString()
  userRole?: string;

  @IsNumber()
  statusCode: number;

  @IsNumber()
  responseTimeMs: number;

  @IsOptional()
  @IsNumber()
  responseSizeBytes?: number;

  @IsOptional()
  @IsObject()
  requestBody?: any;

  @IsOptional()
  @IsNumber()
  requestBodySize?: number;

  @IsOptional()
  @IsObject()
  responseBody?: any;

  @IsOptional()
  @IsNumber()
  responseBodySize?: number;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsString()
  errorStack?: string;
}


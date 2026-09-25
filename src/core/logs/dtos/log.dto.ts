import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OmitType } from '@nestjs/swagger';

import { PaginationDto, SortDirection } from '@common/dto/pagination.dto';
import { LogLevel } from '../types/log.types';

export class CreateLogDto {
  @IsString()
  requestId!: string;

  @IsEnum(LogLevel)
  level!: LogLevel;

  @IsString()
  message!: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsNumber()
  @IsOptional()
  statusCode?: number;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  ip?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsString()
  @IsOptional()
  endpoint?: string;

  @IsString()
  @IsOptional()
  method?: string;

  @IsObject()
  @IsOptional()
  error?: Record<string, any>;
}

/**
 * Extender PaginationDto omitiendo 'search'
 * Proporciona: page, limit, sortBy (con valores por defecto), sortDir (ASC/DESC)
 * Default: sortDir='DESC' para mostrar logs más recientes primero
 */
export class FilterLogsDto extends OmitType(PaginationDto, ['search']) {
  @ApiProperty({
    description: 'Dirección de orden: ASC o DESC',
    enum: SortDirection,
    example: 'DESC',
    required: false,
  })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDir?: SortDirection = SortDirection.DESC;

  @ApiProperty({
    description: 'Nivel de log',
    enum: LogLevel,
    required: false,
  })
  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel;

  @ApiProperty({
    description: 'ID del usuario',
    example: 5,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ApiProperty({
    description: 'ID de la request',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  requestId?: string;

  @ApiProperty({
    description: 'Endpoint',
    example: '/api/products',
    required: false,
  })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiProperty({
    description: 'Método HTTP',
    example: 'GET',
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method?: string;

  @ApiProperty({
    description: 'Término de búsqueda en el mensaje',
    example: 'error',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Fecha inicio (ISO 8601)',
    example: '2026-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    description: 'Fecha fin (ISO 8601)',
    example: '2026-03-02T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({
    description: 'Campo por el que ordenar',
    example: 'createdAt',
    enum: ['createdAt', 'level', 'userId', 'statusCode', 'duration'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'level', 'userId', 'statusCode', 'duration'])
  declare sortBy: 'createdAt' | 'level' | 'userId' | 'statusCode' | 'duration';
}

export class LogResponseDto {
  @ApiProperty({ example: 1 })
  @Expose()
  id!: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  requestId!: string;

  @ApiProperty({ enum: LogLevel, example: 'error' })
  @Expose()
  level!: LogLevel;

  @ApiProperty({ example: 'Unhandled Exception: Cannot GET /api/users' })
  @Expose()
  message!: string;

  @ApiProperty({ example: 404, required: false })
  @Expose()
  statusCode?: number;

  @ApiProperty({ example: '/api/users', required: false })
  @Expose()
  endpoint?: string;

  @ApiProperty({ example: 5, required: false })
  @Expose()
  userId?: number;

  @ApiProperty({ example: 45, required: false })
  @Expose()
  duration?: number;

  @ApiProperty()
  @Expose()
  createdAt!: Date;
}

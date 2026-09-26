import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OmitType } from '@nestjs/swagger';

import { PaginationDto, SortDirection } from '@common/dto/pagination.dto';
import { AuditOperation } from '../types/log.types';
import type { JsonObject } from '../types/log.types';

export class CreateAuditLogDto {
  @IsUUID()
  @IsOptional()
  requestId?: string;

  @IsString()
  entityName!: string;

  @IsString()
  entityId!: string;

  @IsEnum(AuditOperation)
  operation!: AuditOperation;

  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsObject()
  changes!: JsonObject;

  @IsObject()
  @IsOptional()
  metadata?: JsonObject;
}

/**
 * Extender PaginationDto omitiendo 'search'
 * Proporciona: page, limit, sortBy (con valores por defecto), sortDir (ASC/DESC)
 * Default: sortDir='DESC' para mostrar audit logs más recientes primero
 */
export class FilterAuditLogsDto extends OmitType(PaginationDto, ['search']) {
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
    description: 'Nombre de la entidad (ej: Product, Inventory)',
    example: 'Product',
    required: false,
  })
  @IsOptional()
  @IsString()
  entityName?: string;

  @ApiProperty({
    description: 'ID de la request (correlaciona con Log)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  requestId?: string;

  @ApiProperty({
    description: 'Tipo de operación',
    enum: AuditOperation,
    required: false,
  })
  @IsOptional()
  @IsEnum(AuditOperation)
  operation?: AuditOperation;

  @ApiProperty({
    description: 'ID del usuario que hizo el cambio',
    example: 5,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

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
    example: 'loggedAt',
    enum: ['loggedAt', 'userId', 'operation', 'entityName'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['loggedAt', 'userId', 'operation', 'entityName'])
  declare sortBy: 'loggedAt' | 'userId' | 'operation' | 'entityName';
}

export class AuditLogResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  requestId?: string;

  @ApiProperty({ example: 'Product' })
  entityName!: string;

  @ApiProperty({ example: '123' })
  entityId!: string;

  @ApiProperty({ enum: AuditOperation })
  operation!: AuditOperation;

  @ApiProperty({ example: 5, required: false })
  userId?: number;

  @ApiProperty()
  changes!: JsonObject;

  @ApiProperty({ required: false })
  metadata?: JsonObject;

  @ApiProperty()
  loggedAt!: Date;
}

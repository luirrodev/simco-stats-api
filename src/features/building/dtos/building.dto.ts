import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

import { PaginationDto } from '@common/dto/pagination.dto';

export enum BuildingSortBy {
  ID = 'id',
  NAME = 'name',
  SIZE = 'size',
  COST = 'cost',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class BuildingsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: BuildingSortBy, default: BuildingSortBy.NAME })
  @IsOptional()
  @IsEnum(BuildingSortBy)
  sortBy?: BuildingSortBy = BuildingSortBy.NAME;
}

export class BuildingResponseDto {
  @ApiProperty({ example: 123456 })
  @IsInt()
  id!: number;

  @ApiProperty({ example: 'Restaurante Central' }) @IsString() name!: string;
  @ApiProperty({ example: 3 }) @IsInt() @Min(1) size!: number;
  @ApiProperty({ example: 'r' }) @IsString() kind!: string;
  @ApiPropertyOptional({ example: 'sales', nullable: true }) category!:
    string | null;
  @ApiPropertyOptional({ example: 250000, nullable: true }) cost!:
    number | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class BuildingsSyncResponseDto {
  @ApiProperty({ example: true }) success!: boolean;
  @ApiProperty({ example: 2 }) created!: number;
  @ApiProperty({ example: 1 }) updated!: number;
  @ApiProperty({ example: 1 }) deleted!: number;
  @ApiProperty({ example: 3 }) total!: number;
}

export interface SimCompaniesBuildingDto {
  id: number;
  name: string;
  size: number;
  kind: string;
  category?: string;
  cost?: number;
}

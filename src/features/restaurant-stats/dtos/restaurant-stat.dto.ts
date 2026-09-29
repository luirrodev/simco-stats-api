import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import { PaginationDto } from '@common/dto/pagination.dto';

export enum RestaurantStatSortBy {
  DATETIME = 'datetime',
  RATING = 'rating',
  REVENUE = 'revenue',
}

export class RestaurantStatsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ example: 123456 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  restaurantId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  @IsBoolean()
  resolved?: boolean;

  @ApiPropertyOptional({
    enum: RestaurantStatSortBy,
    default: RestaurantStatSortBy.DATETIME,
  })
  @IsOptional()
  @IsEnum(RestaurantStatSortBy)
  sortBy?: RestaurantStatSortBy = RestaurantStatSortBy.DATETIME;
}

export class RestaurantStatsSyncResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 123456 })
  restaurantId!: number;

  @ApiProperty({ example: 2 })
  created!: number;

  @ApiProperty({ example: 3 })
  updated!: number;

  @ApiProperty({ example: 5 })
  total!: number;

  @ApiPropertyOptional({ example: 'Unable to connect to SimCompanies' })
  error?: string;
}

export class RestaurantStatsSyncAllResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 2 })
  totalCreated!: number;

  @ApiProperty({ example: 3 })
  totalUpdated!: number;

  @ApiProperty({ type: [RestaurantStatsSyncResponseDto] })
  results!: RestaurantStatsSyncResponseDto[];
}

export interface SimCompaniesRestaurantRunDto {
  id: number;
  datetime: string;
  rating: number;
  cogs: number;
  wages: number;
  resolved: boolean;
  menuPrice: number;
  buildingSize: number;
  buildingIsLuxury: boolean;
  occupancy?: number;
  revenue?: number;
  newRating?: number;
  review?: string;
}

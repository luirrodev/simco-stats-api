import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsPositive,
  IsString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class PaginationDto {
  @ApiProperty({
    description: 'Número de página (default: 1)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsPositive()
  page?: number = 1;

  @ApiProperty({
    description: 'Cantidad de registros por página (default: 10)',
    example: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsPositive()
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Término de búsqueda para filtrar resultados',
    example: 'Parrilla Tostadora',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Campo por el que ordenar',
    example: 'name',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    description: 'Dirección de orden: ASC o DESC',
    enum: SortDirection,
    example: 'ASC',
    required: false,
  })
  @IsOptional()
  @IsEnum(SortDirection)
  sortDir?: SortDirection = SortDirection.ASC;
}

export class PaginatedResponse<T> {
  @ApiProperty({
    description: 'Array de datos',
  })
  data!: T[];

  @ApiProperty({
    description: 'Página actual',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Cantidad de registros por página',
    example: 10,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total de registros',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: 'Total de páginas',
    example: 10,
  })
  totalPages!: number;

  @ApiProperty({
    description: 'Indica si hay una página anterior',
    example: false,
  })
  hasPrev!: boolean;

  @ApiProperty({
    description: 'Indica si hay una página siguiente',
    example: true,
  })
  hasNext!: boolean;
}

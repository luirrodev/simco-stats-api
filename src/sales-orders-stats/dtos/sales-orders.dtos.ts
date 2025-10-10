import { IsBoolean, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';

export class SaleOrdersDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  page: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  pageSize: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: string }) =>
    value === 'true' ? true : false,
  )
  includeResolved: boolean;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  buildingId: number;
}

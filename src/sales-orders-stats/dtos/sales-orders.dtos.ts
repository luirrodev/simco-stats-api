import { IsBoolean, IsOptional, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';

export class SaleOrdersDto {
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsPositive()
  page: number;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsPositive()
  pageSize: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: string }) =>
    value === 'true' ? true : false,
  )
  includeResolved: boolean;
}

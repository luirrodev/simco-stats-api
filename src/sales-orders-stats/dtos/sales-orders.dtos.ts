import {
  IsBoolean,
  IsOptional,
  IsNumber,
  IsPositive,
  IsDate,
} from 'class-validator';
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

  @IsOptional()
  @IsDate()
  @Transform(({ value }: { value: string }) => new Date(value))
  dateIni: Date;

  // Validar que dateEnd sea mayor o igual a dateIni
  // Validar que este parametro sea obligatorio si viene dateIni
  @IsOptional()
  @IsDate()
  @Transform(({ value }: { value: string }) => new Date(value))
  dateEnd: Date;
}

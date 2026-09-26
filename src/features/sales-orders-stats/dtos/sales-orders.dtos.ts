import {
  IsBoolean,
  IsOptional,
  IsNumber,
  IsPositive,
  ValidateIf,
  IsNotEmpty,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';

@ValidatorConstraint({ name: 'isAfterOrEqual', async: false })
class IsAfterOrEqualConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: Date, args: ValidationArguments) {
    const relatedPropertyName = args.constraints[0] as string;
    const relatedValue = (args.object as Record<string, any>)[
      relatedPropertyName
    ] as Date;
    return !relatedValue || !propertyValue || propertyValue >= relatedValue;
  }

  defaultMessage() {
    return 'La fecha de fin debe ser igual o posterior a la fecha de inicio';
  }
}

/**
 * DTO base con propiedades comunes para filtrado de fechas y edificio
 */
export class BaseSaleOrdersFilterDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  buildingId?: number;

  @IsOptional()
  @ValidateIf((o: BaseSaleOrdersFilterDto) => o.dateEnd !== undefined) // Obligatorio si viene dateEnd
  @IsNotEmpty({
    message:
      'La fecha de inicio es requerida cuando se especifica fecha de fin',
  })
  @Transform(({ value }) => {
    if (!value) return null;
    // Interpretar la fecha como hora local añadiendo 'T00:00:00'
    const date = new Date(value + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  })
  dateIni?: Date;

  @IsOptional()
  @ValidateIf((o: BaseSaleOrdersFilterDto) => o.dateIni !== undefined) // Obligatorio si viene dateIni
  @IsNotEmpty({
    message:
      'La fecha de fin es requerida cuando se especifica fecha de inicio',
  })
  @Validate(IsAfterOrEqualConstraint, ['dateIni'], {
    message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
  })
  @Transform(({ value }) => {
    if (!value) return null;
    // Interpretar la fecha como hora local añadiendo 'T00:00:00'
    const date = new Date(value + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  })
  dateEnd?: Date;
}

/**
 * DTO para el endpoint GET /sale-orders (listado con paginación)
 * Incluye paginación y filtros adicionales
 */
export class GetAllSaleOrdersDto extends BaseSaleOrdersFilterDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  page?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  pageSize?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: string }) =>
    value === 'true' ? true : false,
  )
  includeResolved?: boolean;
}

/**
 * DTO para el endpoint GET /sale-orders/analytics/stats
 * Estadísticas de órdenes y recursos vendidos por tipo
 * La fecha de inicio es obligatoria para este endpoint
 */
export class SaleOrdersStatsDto {
  @IsNotEmpty({
    message: 'La fecha de inicio es requerida para obtener estadísticas',
  })
  @Transform(({ value }) => {
    if (!value) return null;
    // Interpretar la fecha como hora local añadiendo 'T00:00:00'
    const date = new Date(value + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  })
  dateIni: Date;

  @IsOptional()
  @Validate(IsAfterOrEqualConstraint, ['dateIni'], {
    message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
  })
  @Transform(({ value }) => {
    if (!value) return null;
    // Interpretar la fecha como hora local añadiendo 'T00:00:00'
    const date = new Date(value + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  })
  dateEnd?: Date;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  buildingId?: number;
}

/**
 * @deprecated Usar GetAllSaleOrdersDto en su lugar
 */
export class SaleOrdersDto extends GetAllSaleOrdersDto {}

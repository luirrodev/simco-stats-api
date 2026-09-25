import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsPositive,
  IsNumber,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CreateStaffDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  readonly email!: string;

  @IsString()
  @ApiProperty()
  @IsNotEmpty()
  readonly firstName!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  readonly secondName?: string;

  @IsString()
  @ApiProperty()
  @IsNotEmpty()
  readonly lastName!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  readonly secondLastName?: string;

  @IsString()
  @IsNotEmpty()
  @Length(8)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe contener mayúsculas, minúsculas y números',
  })
  @ApiProperty({ minLength: 8 })
  readonly password!: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @ApiProperty()
  readonly role!: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  readonly employeeCode?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  readonly department?: string;
}

export class UpdateStaffDto extends PartialType(CreateStaffDto) {}

export class StaffResponseDto {
  @ApiProperty({ example: 1, description: 'ID del staff' })
  @Expose()
  id!: number;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Correo electrónico',
  })
  @Expose()
  email!: string;

  @ApiProperty({ example: 'John', description: 'Primer nombre del staff' })
  @Expose()
  firstName!: string;

  @ApiProperty({ nullable: true })
  @Expose()
  secondName!: string | null;

  @ApiProperty({ example: 'Doe', description: 'Primer apellido del staff' })
  @Expose()
  lastName!: string;

  @ApiProperty({ nullable: true })
  @Expose()
  secondLastName!: string | null;

  @ApiProperty({
    example: 'operator',
    description: 'Rol del staff',
    nullable: true,
  })
  @Expose()
  role!: string;

  @ApiProperty({ example: true, description: 'Si el staff está activo' })
  @Expose()
  isActive!: boolean;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Último inicio de sesión',
    nullable: true,
  })
  @Expose()
  lastLoginAt!: Date | null;

  @ApiProperty({
    example: 'EMP-001',
    description: 'Código de empleado',
    nullable: true,
  })
  @Expose()
  employeeCode!: string | null;

  @ApiProperty({
    example: 'Pagos',
    description: 'Departamento',
    nullable: true,
  })
  @Expose()
  department!: string | null;
}

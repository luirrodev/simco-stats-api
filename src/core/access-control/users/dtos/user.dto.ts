import {
  IsString,
  IsNotEmpty,
  IsEmail,
  Length,
  IsPositive,
  IsNumber,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CreateUserDto {
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
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  readonly googleId?: string;

  @IsOptional()
  @IsString()
  readonly authProvider?: string;

  @IsOptional()
  @IsString()
  readonly avatar?: string;
}

export class UserResponseDto {
  @ApiProperty({ example: 1, description: 'ID del usuario' })
  @Expose()
  id!: number;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Correo electrónico',
  })
  @Expose()
  email!: string;

  @ApiProperty({ example: 'John', description: 'Primer nombre del usuario' })
  @Expose()
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  secondName!: string | null;

  @ApiProperty({ example: 'Doe', description: 'Primer apellido del usuario' })
  @Expose()
  lastName!: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  secondLastName!: string | null;

  @ApiProperty({
    example: 'admin',
    description: 'Rol del usuario',
    nullable: true,
  })
  @Expose()
  role!: string;

  @ApiProperty({ example: true, description: 'Si el usuario está activo' })
  @Expose()
  isActive!: boolean;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Último inicio de sesión',
    nullable: true,
  })
  @Expose()
  lastLoginAt!: Date | null;
}

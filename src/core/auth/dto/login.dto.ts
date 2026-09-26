import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  readonly email!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly password!: string;
}

export class EmptyAuthDto {
  @ApiHideProperty()
  private readonly _empty?: never;
}

export class AccessTokenDto {
  @ApiProperty()
  accessToken!: string;
}

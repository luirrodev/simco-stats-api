import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

export class EmptyAuthDto {}

export class AccessTokenDto {
  @ApiProperty()
  accessToken!: string;
}

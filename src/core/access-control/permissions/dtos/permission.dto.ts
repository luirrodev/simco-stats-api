import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePermissionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Descripción del permiso',
    example: 'Permite crear un usuario',
  })
  readonly description!: string;
}

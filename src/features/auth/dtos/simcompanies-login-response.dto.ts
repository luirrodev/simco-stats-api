import { ApiProperty } from '@nestjs/swagger';

export class SimCompaniesLoginResponseDto {
  @ApiProperty({
    example: 'SimCompanies authentication completed successfully',
  })
  message!: string;

  @ApiProperty({ example: '2026-09-25T21:15:00.000Z' })
  authenticatedAt!: Date;

  @ApiProperty({ example: true })
  isValid!: boolean;

  @ApiProperty({
    example: '2026-10-02T21:15:00.000Z',
    nullable: true,
    description: 'Null when SimCompanies does not provide cookie expiration.',
  })
  expiresAt!: Date | null;
}

import { ApiPropertyOptional } from '@nestjs/swagger'
import { TransactionType } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator'

export class FindTransactionsQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date-time', example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date

  @ApiPropertyOptional({ type: String, format: 'date-time', example: '2026-09-30T23:59:59.999Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string

  // Огромный page переполняет skip (int64 в Prisma) — без границы 500 вместо 400.
  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 1_000_000, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page: number = 1

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10
}

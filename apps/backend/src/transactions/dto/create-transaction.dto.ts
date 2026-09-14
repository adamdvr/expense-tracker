import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { TransactionType } from '@prisma/client'
import { Type } from 'class-transformer'
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator'

export class CreateTransactionDto {
  @ApiProperty({ example: 1500.5, description: 'Сумма, не более 2 знаков после запятой' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(9999999999.99)
  amount!: number

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType)
  type!: TransactionType

  @ApiPropertyOptional({ example: 'Продукты на неделю', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string

  @ApiProperty({ type: String, format: 'date-time', example: '2026-09-10T12:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  date!: Date

  @ApiProperty({ example: 'clx1a2b3c0000abcd1234efgh' })
  @IsString()
  @IsNotEmpty()
  categoryId!: string
}

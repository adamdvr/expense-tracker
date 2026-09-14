import { ApiProperty } from '@nestjs/swagger'
import { TransactionType } from '@prisma/client'

export class CategorySummaryEntity {
  @ApiProperty()
  categoryId: string

  @ApiProperty()
  name: string

  @ApiProperty()
  color: string

  @ApiProperty()
  icon: string

  @ApiProperty({ enum: TransactionType })
  type: TransactionType

  @ApiProperty({ example: '23100.00' })
  total: string

  constructor(summary: CategorySummaryEntity) {
    this.categoryId = summary.categoryId
    this.name = summary.name
    this.color = summary.color
    this.icon = summary.icon
    this.type = summary.type
    this.total = summary.total
  }
}

export class TransactionSummaryEntity {
  @ApiProperty({ example: 9 })
  month: number

  @ApiProperty({ example: 2026 })
  year: number

  @ApiProperty({ example: '150000.00' })
  totalIncome: string

  @ApiProperty({ example: '87450.50' })
  totalExpense: string

  @ApiProperty({ example: '62549.50' })
  balance: string

  @ApiProperty({ type: [CategorySummaryEntity] })
  byCategory: CategorySummaryEntity[]

  constructor(summary: TransactionSummaryEntity) {
    this.month = summary.month
    this.year = summary.year
    this.totalIncome = summary.totalIncome
    this.totalExpense = summary.totalExpense
    this.balance = summary.balance
    this.byCategory = summary.byCategory.map((item) => new CategorySummaryEntity(item))
  }
}

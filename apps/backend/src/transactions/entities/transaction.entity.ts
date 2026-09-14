import { ApiProperty } from '@nestjs/swagger'
import { Transaction, TransactionType } from '@prisma/client'

export class TransactionEntity {
  @ApiProperty()
  id: string

  @ApiProperty({ example: '1500.50', description: 'Сумма в виде строки с 2 знаками после запятой' })
  amount: string

  @ApiProperty({ enum: TransactionType })
  type: TransactionType

  @ApiProperty({ type: String, nullable: true })
  description: string | null

  @ApiProperty()
  date: Date

  @ApiProperty()
  categoryId: string

  @ApiProperty()
  userId: string

  @ApiProperty()
  createdAt: Date

  constructor(transaction: Transaction) {
    this.id = transaction.id
    this.amount = transaction.amount.toFixed(2)
    this.type = transaction.type
    this.description = transaction.description
    this.date = transaction.date
    this.categoryId = transaction.categoryId
    this.userId = transaction.userId
    this.createdAt = transaction.createdAt
  }
}

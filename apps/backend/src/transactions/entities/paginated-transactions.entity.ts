import { ApiProperty } from '@nestjs/swagger'
import { Transaction } from '@prisma/client'
import { TransactionEntity } from './transaction.entity'

export class PaginatedTransactionsEntity {
  @ApiProperty({ type: [TransactionEntity] })
  items: TransactionEntity[]

  @ApiProperty({ example: 42, description: 'Общее количество транзакций по фильтрам' })
  total: number

  @ApiProperty({ example: 1 })
  page: number

  @ApiProperty({ example: 10 })
  limit: number

  @ApiProperty({ example: 5 })
  totalPages: number

  constructor({
    items,
    total,
    page,
    limit,
  }: {
    items: Transaction[]
    total: number
    page: number
    limit: number
  }) {
    this.items = items.map((transaction) => new TransactionEntity(transaction))
    this.total = total
    this.page = page
    this.limit = limit
    this.totalPages = Math.ceil(total / limit)
  }
}

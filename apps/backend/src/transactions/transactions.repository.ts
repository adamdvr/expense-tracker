import { Injectable } from '@nestjs/common'
import { Category, Prisma, Transaction } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateTransactionDto } from './dto/create-transaction.dto'
import { FindTransactionsQueryDto } from './dto/find-transactions-query.dto'
import { UpdateTransactionDto } from './dto/update-transaction.dto'

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, data: CreateTransactionDto): Promise<Transaction> {
    return this.prisma.transaction.create({ data: { ...data, userId } })
  }

  async findAllByUser(
    userId: string,
    filters: FindTransactionsQueryDto
  ): Promise<{ items: Transaction[]; total: number }> {
    const { dateFrom, dateTo, type, categoryId, page, limit } = filters
    const where: Prisma.TransactionWhereInput = { userId, type, categoryId }
    if (dateFrom || dateTo) {
      where.date = { gte: dateFrom, lte: dateTo }
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ])

    return { items, total }
  }

  findByIdAndUser(id: string, userId: string): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({ where: { id, userId } })
  }

  update(id: string, data: UpdateTransactionDto): Promise<Transaction> {
    return this.prisma.transaction.update({ where: { id }, data })
  }

  delete(id: string): Promise<Transaction> {
    return this.prisma.transaction.delete({ where: { id } })
  }

  findCategoryByIdAndUser(categoryId: string, userId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({ where: { id: categoryId, userId } })
  }

  sumByCategory(userId: string, from: Date, to: Date) {
    return this.prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: { userId, date: { gte: from, lt: to } },
      _sum: { amount: true },
    })
  }

  findCategoriesByIds(ids: string[]): Promise<Category[]> {
    return this.prisma.category.findMany({ where: { id: { in: ids } } })
  }
}

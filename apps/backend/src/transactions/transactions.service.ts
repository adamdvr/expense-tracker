import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, Transaction, TransactionType } from '@prisma/client'
import { CreateTransactionDto } from './dto/create-transaction.dto'
import { FindTransactionsQueryDto } from './dto/find-transactions-query.dto'
import { SummaryQueryDto } from './dto/summary-query.dto'
import { UpdateTransactionDto } from './dto/update-transaction.dto'
import { PaginatedTransactionsEntity } from './entities/paginated-transactions.entity'
import { CategorySummaryEntity, TransactionSummaryEntity } from './entities/transaction-summary.entity'
import { TransactionsRepository } from './transactions.repository'

@Injectable()
export class TransactionsService {
  constructor(private readonly transactionsRepository: TransactionsRepository) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    await this.ensureCategoryOwned(dto.categoryId, userId)
    return this.transactionsRepository.create(userId, dto)
  }

  async findAll(
    userId: string,
    query: FindTransactionsQueryDto
  ): Promise<PaginatedTransactionsEntity> {
    const { items, total } = await this.transactionsRepository.findAllByUser(userId, query)
    return new PaginatedTransactionsEntity({ items, total, page: query.page, limit: query.limit })
  }

  findOne(id: string, userId: string): Promise<Transaction> {
    return this.findOwnedOrThrow(id, userId)
  }

  async update(id: string, userId: string, dto: UpdateTransactionDto): Promise<Transaction> {
    await this.findOwnedOrThrow(id, userId)
    if (dto.categoryId) {
      await this.ensureCategoryOwned(dto.categoryId, userId)
    }
    return this.transactionsRepository.update(id, dto)
  }

  async remove(id: string, userId: string): Promise<Transaction> {
    await this.findOwnedOrThrow(id, userId)
    return this.transactionsRepository.delete(id)
  }

  async getSummary(userId: string, { month, year }: SummaryQueryDto): Promise<TransactionSummaryEntity> {
    const from = new Date(Date.UTC(year, month - 1, 1))
    const to = new Date(Date.UTC(year, month, 1))

    const groups = await this.transactionsRepository.sumByCategory(userId, from, to)
    const categoryIds = [...new Set(groups.map((group) => group.categoryId))]
    const categories = await this.transactionsRepository.findCategoriesByIds(categoryIds)
    const categoriesById = new Map(categories.map((category) => [category.id, category]))

    let totalIncome = new Prisma.Decimal(0)
    let totalExpense = new Prisma.Decimal(0)
    const byCategory: { item: CategorySummaryEntity; total: Prisma.Decimal }[] = []

    for (const group of groups) {
      const total = group._sum.amount ?? new Prisma.Decimal(0)
      if (group.type === TransactionType.INCOME) {
        totalIncome = totalIncome.plus(total)
      } else {
        totalExpense = totalExpense.plus(total)
      }

      const category = categoriesById.get(group.categoryId)
      if (!category) continue
      byCategory.push({
        total,
        item: {
          categoryId: category.id,
          name: category.name,
          color: category.color,
          icon: category.icon,
          type: group.type,
          total: total.toFixed(2),
        },
      })
    }

    byCategory.sort((a, b) => b.total.comparedTo(a.total))

    return new TransactionSummaryEntity({
      month,
      year,
      totalIncome: totalIncome.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      balance: totalIncome.minus(totalExpense).toFixed(2),
      byCategory: byCategory.map(({ item }) => item),
    })
  }

  private async findOwnedOrThrow(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findByIdAndUser(id, userId)
    if (!transaction) {
      throw new NotFoundException('Транзакция не найдена')
    }
    return transaction
  }

  private async ensureCategoryOwned(categoryId: string, userId: string): Promise<void> {
    const category = await this.transactionsRepository.findCategoryByIdAndUser(categoryId, userId)
    if (!category) {
      throw new NotFoundException('Категория не найдена')
    }
  }
}

import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Category, Prisma, Transaction, TransactionType } from '@prisma/client'
import { CreateTransactionDto } from './dto/create-transaction.dto'
import { FindTransactionsQueryDto } from './dto/find-transactions-query.dto'
import { TransactionsRepository } from './transactions.repository'
import { TransactionsService } from './transactions.service'

type SumGroup = Awaited<ReturnType<TransactionsRepository['sumByCategory']>>[number]

const USER_ID = 'user-1'

const buildTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  amount: new Prisma.Decimal('100.00'),
  type: TransactionType.EXPENSE,
  description: null,
  date: new Date('2026-09-01T00:00:00.000Z'),
  categoryId: 'cat-1',
  userId: USER_ID,
  createdAt: new Date('2026-09-01T10:00:00.000Z'),
  ...overrides,
})

const buildCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  name: 'Еда',
  color: '#ff0000',
  icon: 'utensils',
  userId: USER_ID,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
})

const buildGroup = (categoryId: string, type: TransactionType, amount: string | null): SumGroup =>
  ({
    categoryId,
    type,
    _sum: { amount: amount === null ? null : new Prisma.Decimal(amount) },
  }) as SumGroup

describe('TransactionsService', () => {
  let service: TransactionsService
  let repository: jest.Mocked<TransactionsRepository>

  beforeEach(async () => {
    const repositoryMock: Partial<jest.Mocked<TransactionsRepository>> = {
      create: jest.fn(),
      findAllByUser: jest.fn(),
      findByIdAndUser: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findCategoryByIdAndUser: jest.fn(),
      sumByCategory: jest.fn(),
      findCategoriesByIds: jest.fn(),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [TransactionsService, { provide: TransactionsRepository, useValue: repositoryMock }],
    }).compile()

    service = moduleRef.get(TransactionsService)
    repository = moduleRef.get(TransactionsRepository)
  })

  describe('create', () => {
    const dto: CreateTransactionDto = {
      amount: 100,
      type: TransactionType.EXPENSE,
      date: new Date('2026-09-01T00:00:00.000Z'),
      categoryId: 'cat-1',
    }

    it('создаёт транзакцию в своей категории', async () => {
      const transaction = buildTransaction()
      repository.findCategoryByIdAndUser.mockResolvedValue(buildCategory())
      repository.create.mockResolvedValue(transaction)

      const result = await service.create(USER_ID, dto)

      expect(repository.findCategoryByIdAndUser).toHaveBeenCalledWith('cat-1', USER_ID)
      expect(repository.create).toHaveBeenCalledWith(USER_ID, dto)
      expect(result).toBe(transaction)
    })

    it('бросает NotFoundException для чужой категории и не создаёт транзакцию', async () => {
      repository.findCategoryByIdAndUser.mockResolvedValue(null)

      await expect(service.create(USER_ID, dto)).rejects.toThrow(NotFoundException)
      expect(repository.create).not.toHaveBeenCalled()
    })
  })

  describe('findAll', () => {
    it('возвращает страницу с page и limit из запроса', async () => {
      const items = [buildTransaction()]
      const query: FindTransactionsQueryDto = { page: 2, limit: 5 }
      repository.findAllByUser.mockResolvedValue({ items, total: 6 })

      const result = await service.findAll(USER_ID, query)

      expect(repository.findAllByUser).toHaveBeenCalledWith(USER_ID, query)
      expect(result).toEqual({ items, total: 6, page: 2, limit: 5 })
    })
  })

  describe('findOne', () => {
    it('возвращает свою транзакцию', async () => {
      const transaction = buildTransaction()
      repository.findByIdAndUser.mockResolvedValue(transaction)

      await expect(service.findOne('tx-1', USER_ID)).resolves.toBe(transaction)
      expect(repository.findByIdAndUser).toHaveBeenCalledWith('tx-1', USER_ID)
    })

    it('бросает NotFoundException для чужой или несуществующей транзакции', async () => {
      repository.findByIdAndUser.mockResolvedValue(null)

      await expect(service.findOne('tx-1', USER_ID)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('обновляет свою транзакцию без смены категории, не проверяя категорию', async () => {
      const updated = buildTransaction({ description: 'Обед' })
      repository.findByIdAndUser.mockResolvedValue(buildTransaction())
      repository.update.mockResolvedValue(updated)

      const result = await service.update('tx-1', USER_ID, { description: 'Обед' })

      expect(repository.findCategoryByIdAndUser).not.toHaveBeenCalled()
      expect(repository.update).toHaveBeenCalledWith('tx-1', { description: 'Обед' })
      expect(result).toBe(updated)
    })

    it('проверяет новую категорию на принадлежность пользователю', async () => {
      repository.findByIdAndUser.mockResolvedValue(buildTransaction())
      repository.findCategoryByIdAndUser.mockResolvedValue(buildCategory({ id: 'cat-2' }))
      repository.update.mockResolvedValue(buildTransaction({ categoryId: 'cat-2' }))

      await service.update('tx-1', USER_ID, { categoryId: 'cat-2' })

      expect(repository.findCategoryByIdAndUser).toHaveBeenCalledWith('cat-2', USER_ID)
      expect(repository.update).toHaveBeenCalledWith('tx-1', { categoryId: 'cat-2' })
    })

    it('бросает NotFoundException для чужой транзакции и не обновляет её', async () => {
      repository.findByIdAndUser.mockResolvedValue(null)

      await expect(service.update('tx-1', USER_ID, { description: 'Обед' })).rejects.toThrow(
        NotFoundException
      )
      expect(repository.update).not.toHaveBeenCalled()
    })

    it('бросает NotFoundException при переносе в чужую категорию и не обновляет транзакцию', async () => {
      repository.findByIdAndUser.mockResolvedValue(buildTransaction())
      repository.findCategoryByIdAndUser.mockResolvedValue(null)

      await expect(service.update('tx-1', USER_ID, { categoryId: 'cat-foreign' })).rejects.toThrow(
        NotFoundException
      )
      expect(repository.update).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('удаляет свою транзакцию', async () => {
      const transaction = buildTransaction()
      repository.findByIdAndUser.mockResolvedValue(transaction)
      repository.delete.mockResolvedValue(transaction)

      await expect(service.remove('tx-1', USER_ID)).resolves.toBe(transaction)
      expect(repository.delete).toHaveBeenCalledWith('tx-1')
    })

    it('бросает NotFoundException для чужой транзакции и не удаляет её', async () => {
      repository.findByIdAndUser.mockResolvedValue(null)

      await expect(service.remove('tx-1', USER_ID)).rejects.toThrow(NotFoundException)
      expect(repository.delete).not.toHaveBeenCalled()
    })
  })

  describe('getSummary', () => {
    it('запрашивает суммы за месяц в границах полуночи UTC', async () => {
      repository.sumByCategory.mockResolvedValue([])
      repository.findCategoriesByIds.mockResolvedValue([])

      await service.getSummary(USER_ID, { month: 9, year: 2026 })

      expect(repository.sumByCategory).toHaveBeenCalledWith(
        USER_ID,
        new Date('2026-09-01T00:00:00.000Z'),
        new Date('2026-10-01T00:00:00.000Z')
      )
    })

    it('для декабря верхняя граница — 1 января следующего года', async () => {
      repository.sumByCategory.mockResolvedValue([])
      repository.findCategoriesByIds.mockResolvedValue([])

      await service.getSummary(USER_ID, { month: 12, year: 2026 })

      expect(repository.sumByCategory).toHaveBeenCalledWith(
        USER_ID,
        new Date('2026-12-01T00:00:00.000Z'),
        new Date('2027-01-01T00:00:00.000Z')
      )
    })

    it('без транзакций возвращает нулевые суммы и пустой список категорий', async () => {
      repository.sumByCategory.mockResolvedValue([])
      repository.findCategoriesByIds.mockResolvedValue([])

      const result = await service.getSummary(USER_ID, { month: 9, year: 2026 })

      expect(result).toEqual({
        month: 9,
        year: 2026,
        totalIncome: '0.00',
        totalExpense: '0.00',
        balance: '0.00',
        byCategory: [],
      })
    })

    it('считает доходы, расходы и баланс в Decimal без ошибок округления', async () => {
      repository.sumByCategory.mockResolvedValue([
        buildGroup('cat-salary', TransactionType.INCOME, '0.10'),
        buildGroup('cat-bonus', TransactionType.INCOME, '0.20'),
        buildGroup('cat-food', TransactionType.EXPENSE, '0.30'),
        buildGroup('cat-taxi', TransactionType.EXPENSE, '0.05'),
      ])
      repository.findCategoriesByIds.mockResolvedValue([
        buildCategory({ id: 'cat-salary' }),
        buildCategory({ id: 'cat-bonus' }),
        buildCategory({ id: 'cat-food' }),
        buildCategory({ id: 'cat-taxi' }),
      ])

      const result = await service.getSummary(USER_ID, { month: 9, year: 2026 })

      expect(result.totalIncome).toBe('0.30')
      expect(result.totalExpense).toBe('0.35')
      expect(result.balance).toBe('-0.05')
    })

    it('запрашивает каждую категорию один раз, даже если в ней есть и доходы, и расходы', async () => {
      repository.sumByCategory.mockResolvedValue([
        buildGroup('cat-1', TransactionType.INCOME, '10.00'),
        buildGroup('cat-1', TransactionType.EXPENSE, '5.00'),
      ])
      repository.findCategoriesByIds.mockResolvedValue([buildCategory()])

      const result = await service.getSummary(USER_ID, { month: 9, year: 2026 })

      expect(repository.findCategoriesByIds).toHaveBeenCalledWith(['cat-1'])
      expect(result.byCategory).toHaveLength(2)
    })

    it('сортирует категории по убыванию суммы и отдаёт суммы строкой с двумя знаками', async () => {
      repository.sumByCategory.mockResolvedValue([
        buildGroup('cat-small', TransactionType.EXPENSE, '9.5'),
        buildGroup('cat-big', TransactionType.INCOME, '1000'),
        buildGroup('cat-mid', TransactionType.EXPENSE, '100.25'),
      ])
      repository.findCategoriesByIds.mockResolvedValue([
        buildCategory({ id: 'cat-small', name: 'Кофе', color: '#111111', icon: 'coffee' }),
        buildCategory({ id: 'cat-big', name: 'Зарплата', color: '#222222', icon: 'wallet' }),
        buildCategory({ id: 'cat-mid', name: 'Продукты', color: '#333333', icon: 'cart' }),
      ])

      const result = await service.getSummary(USER_ID, { month: 9, year: 2026 })

      expect(result.byCategory).toEqual([
        {
          categoryId: 'cat-big',
          name: 'Зарплата',
          color: '#222222',
          icon: 'wallet',
          type: TransactionType.INCOME,
          total: '1000.00',
        },
        {
          categoryId: 'cat-mid',
          name: 'Продукты',
          color: '#333333',
          icon: 'cart',
          type: TransactionType.EXPENSE,
          total: '100.25',
        },
        {
          categoryId: 'cat-small',
          name: 'Кофе',
          color: '#111111',
          icon: 'coffee',
          type: TransactionType.EXPENSE,
          total: '9.50',
        },
      ])
    })

    it('считает пустую сумму группы нулём', async () => {
      repository.sumByCategory.mockResolvedValue([buildGroup('cat-1', TransactionType.EXPENSE, null)])
      repository.findCategoriesByIds.mockResolvedValue([buildCategory()])

      const result = await service.getSummary(USER_ID, { month: 9, year: 2026 })

      expect(result.totalExpense).toBe('0.00')
      expect(result.byCategory.map((item) => item.total)).toEqual(['0.00'])
    })

    it('учитывает в итогах группу без найденной категории, но не показывает её в списке', async () => {
      repository.sumByCategory.mockResolvedValue([
        buildGroup('cat-1', TransactionType.EXPENSE, '10.00'),
        buildGroup('cat-missing', TransactionType.EXPENSE, '5.00'),
      ])
      repository.findCategoriesByIds.mockResolvedValue([buildCategory()])

      const result = await service.getSummary(USER_ID, { month: 9, year: 2026 })

      expect(result.totalExpense).toBe('15.00')
      expect(result.byCategory.map((item) => item.categoryId)).toEqual(['cat-1'])
    })
  })
})

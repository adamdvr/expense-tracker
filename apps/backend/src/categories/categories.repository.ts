import { Injectable } from '@nestjs/common'
import { Category } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, data: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({ data: { ...data, userId } })
  }

  findAllByUser(userId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })
  }

  findByIdAndUser(id: string, userId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({ where: { id, userId } })
  }

  update(id: string, data: UpdateCategoryDto): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data })
  }

  async hasTransactions(id: string): Promise<boolean> {
    const count = await this.prisma.transaction.count({ where: { categoryId: id } })
    return count > 0
  }

  delete(id: string): Promise<Category> {
    return this.prisma.category.delete({ where: { id } })
  }
}

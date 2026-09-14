import { Injectable, NotFoundException } from '@nestjs/common'
import { Category } from '@prisma/client'
import { CategoriesRepository } from './categories.repository'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesRepository.create(userId, dto)
  }

  findAll(userId: string): Promise<Category[]> {
    return this.categoriesRepository.findAllByUser(userId)
  }

  async update(id: string, userId: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.findOwnedOrThrow(id, userId)
    return this.categoriesRepository.update(id, dto)
  }

  async remove(id: string, userId: string): Promise<Category> {
    await this.findOwnedOrThrow(id, userId)
    return this.categoriesRepository.delete(id)
  }

  private async findOwnedOrThrow(id: string, userId: string): Promise<Category> {
    const category = await this.categoriesRepository.findByIdAndUser(id, userId)
    if (!category) {
      throw new NotFoundException('Категория не найдена')
    }
    return category
  }
}

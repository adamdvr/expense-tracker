import { ApiProperty } from '@nestjs/swagger'
import { Category } from '@prisma/client'

export class CategoryEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  color: string

  @ApiProperty()
  icon: string

  @ApiProperty()
  userId: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date

  constructor(category: Category) {
    this.id = category.id
    this.name = category.name
    this.color = category.color
    this.icon = category.icon
    this.userId = category.userId
    this.createdAt = category.createdAt
    this.updatedAt = category.updatedAt
  }
}

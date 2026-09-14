import { ApiProperty } from '@nestjs/swagger'
import { User } from '@prisma/client'

export class UserEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  email: string

  @ApiProperty({ nullable: true })
  name: string | null

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date

  constructor(user: User) {
    this.id = user.id
    this.email = user.email
    this.name = user.name
    this.createdAt = user.createdAt
    this.updatedAt = user.updatedAt
  }
}

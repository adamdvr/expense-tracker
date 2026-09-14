import { ConflictException, Injectable } from '@nestjs/common'
import { User } from '@prisma/client'
import { UserRepository } from './user.repository'

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(data: { email: string; passwordHash: string; name?: string }): Promise<User> {
    const existing = await this.userRepository.findByEmail(data.email)
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует')
    }

    return this.userRepository.create(data)
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email)
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id)
  }
}

import { Injectable } from '@nestjs/common'
import { User } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Слой доступа к данным для модели `User`.
 *
 * Единственное место модуля `user`, которое обращается к Prisma напрямую —
 * `UserService` работает с БД только через этот репозиторий.
 *
 * Все методы возвращают сырую Prisma-модель `User`, включая `passwordHash`.
 * Наружу (в ответы API) её нужно отдавать только обёрнутой в `UserEntity`.
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Создаёт пользователя.
   *
   * Уникальность email здесь не проверяется — это делает `UserService.create()`.
   * При гонке запросов Prisma бросит ошибку `P2002` (unique constraint на `email`).
   *
   * @param data.email - email пользователя (уникален в БД)
   * @param data.passwordHash - уже захешированный пароль (bcrypt), не сырой пароль
   * @param data.name - отображаемое имя, необязательно
   * @returns созданный пользователь
   */
  create(data: { email: string; passwordHash: string; name?: string }): Promise<User> {
    return this.prisma.user.create({ data })
  }

  /**
   * Ищет пользователя по email (через `UserService` — при логине и проверке занятости email).
   *
   * @param email - email для поиска (сравнение точное, с учётом регистра)
   * @returns пользователь или `null`, если не найден
   */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  /**
   * Ищет пользователя по id (через `UserService` — в `JwtStrategy.validate()` по `sub` из токена).
   *
   * @param id - идентификатор пользователя (cuid)
   * @returns пользователь или `null`, если не найден
   */
  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }
}

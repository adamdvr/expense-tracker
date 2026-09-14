import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { UserService } from '../user/user.service'
import { UserEntity } from '../user/entities/user.entity'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { AuthResponseDto } from './dto/auth-response.dto'

const SALT_ROUNDS = 10

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS)
    const user = await this.userService.createUser({
      email: dto.email,
      passwordHash,
      name: dto.name,
    })

    return this.buildAuthResponse(user.id, user.email, new UserEntity(user))
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userService.findByEmail(dto.email)
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль')
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль')
    }

    return this.buildAuthResponse(user.id, user.email, new UserEntity(user))
  }

  private buildAuthResponse(sub: string, email: string, user: UserEntity): AuthResponseDto {
    const access_token = this.jwtService.sign({ sub, email })
    return { access_token, user }
  }
}

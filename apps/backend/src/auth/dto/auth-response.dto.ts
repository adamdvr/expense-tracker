import { ApiProperty } from '@nestjs/swagger'
import { UserEntity } from '../../user/entities/user.entity'

export class AuthResponseDto {
  @ApiProperty()
  access_token!: string

  @ApiProperty({ type: UserEntity })
  user!: UserEntity
}

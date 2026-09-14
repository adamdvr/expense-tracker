import { ApiProperty } from '@nestjs/swagger'
import { IsHexColor, IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class CreateCategoryDto {
  @ApiProperty({ example: 'Продукты', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string

  @ApiProperty({ example: '#FF5733' })
  @IsHexColor()
  color!: string

  @ApiProperty({ example: 'shopping-cart', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  icon!: string
}

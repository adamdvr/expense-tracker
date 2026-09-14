import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { User } from '@prisma/client'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CategoriesService } from './categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { CategoryEntity } from './entities/category.entity'

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Создание категории' })
  @ApiResponse({ status: 201, description: 'Категория создана', type: CategoryEntity })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async create(@CurrentUser() user: User, @Body() dto: CreateCategoryDto): Promise<CategoryEntity> {
    const category = await this.categoriesService.create(user.id, dto)
    return new CategoryEntity(category)
  }

  @Get()
  @ApiOperation({ summary: 'Получение всех категорий пользователя' })
  @ApiResponse({ status: 200, description: 'Список категорий', type: [CategoryEntity] })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async findAll(@CurrentUser() user: User): Promise<CategoryEntity[]> {
    const categories = await this.categoriesService.findAll(user.id)
    return categories.map((category) => new CategoryEntity(category))
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновление категории' })
  @ApiResponse({ status: 200, description: 'Категория обновлена', type: CategoryEntity })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto
  ): Promise<CategoryEntity> {
    const category = await this.categoriesService.update(id, user.id, dto)
    return new CategoryEntity(category)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление категории' })
  @ApiResponse({ status: 204, description: 'Категория удалена' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  @ApiResponse({ status: 409, description: 'В категории есть транзакции' })
  async remove(@CurrentUser() user: User, @Param('id') id: string): Promise<void> {
    await this.categoriesService.remove(id, user.id)
  }
}

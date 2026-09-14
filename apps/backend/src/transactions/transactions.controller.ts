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
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { User } from '@prisma/client'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateTransactionDto } from './dto/create-transaction.dto'
import { FindTransactionsQueryDto } from './dto/find-transactions-query.dto'
import { SummaryQueryDto } from './dto/summary-query.dto'
import { UpdateTransactionDto } from './dto/update-transaction.dto'
import { TransactionSummaryEntity } from './entities/transaction-summary.entity'
import { TransactionEntity } from './entities/transaction.entity'
import { TransactionsService } from './transactions.service'

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Создание транзакции' })
  @ApiResponse({ status: 201, description: 'Транзакция создана', type: TransactionEntity })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  async create(@CurrentUser() user: User, @Body() dto: CreateTransactionDto): Promise<TransactionEntity> {
    const transaction = await this.transactionsService.create(user.id, dto)
    return new TransactionEntity(transaction)
  }

  @Get()
  @ApiOperation({ summary: 'Получение транзакций пользователя с фильтрами' })
  @ApiResponse({ status: 200, description: 'Список транзакций', type: [TransactionEntity] })
  @ApiResponse({ status: 400, description: 'Некорректные параметры фильтра' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: FindTransactionsQueryDto
  ): Promise<TransactionEntity[]> {
    const transactions = await this.transactionsService.findAll(user.id, query)
    return transactions.map((transaction) => new TransactionEntity(transaction))
  }

  // Объявлен до GET :id, иначе "summary" будет пойман как id
  @Get('summary')
  @ApiOperation({ summary: 'Сводка доходов и расходов за месяц' })
  @ApiResponse({ status: 200, description: 'Сводка за месяц', type: TransactionSummaryEntity })
  @ApiResponse({ status: 400, description: 'Некорректные month или year' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  getSummary(@CurrentUser() user: User, @Query() query: SummaryQueryDto): Promise<TransactionSummaryEntity> {
    return this.transactionsService.getSummary(user.id, query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получение транзакции' })
  @ApiResponse({ status: 200, description: 'Транзакция', type: TransactionEntity })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Транзакция не найдена' })
  async findOne(@CurrentUser() user: User, @Param('id') id: string): Promise<TransactionEntity> {
    const transaction = await this.transactionsService.findOne(id, user.id)
    return new TransactionEntity(transaction)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновление транзакции' })
  @ApiResponse({ status: 200, description: 'Транзакция обновлена', type: TransactionEntity })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Транзакция или категория не найдена' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto
  ): Promise<TransactionEntity> {
    const transaction = await this.transactionsService.update(id, user.id, dto)
    return new TransactionEntity(transaction)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удаление транзакции' })
  @ApiResponse({ status: 204, description: 'Транзакция удалена' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Транзакция не найдена' })
  async remove(@CurrentUser() user: User, @Param('id') id: string): Promise<void> {
    await this.transactionsService.remove(id, user.id)
  }
}

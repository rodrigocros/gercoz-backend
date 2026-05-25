import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, OrderStatus, OrderType } from '@prisma/client';

@Controller('orders')
@UseGuards(RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async findAll(
    @Query('status') status: OrderStatus | undefined,
    @Query('type') type: OrderType | undefined,
    @CurrentUser() user: { restaurantId: string },
  ) {
    return this.ordersService.findAll({ status, type }, user.restaurantId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { restaurantId: string },
  ) {
    return this.ordersService.findOne(id, user.restaurantId);
  }

  @Post()
  @Roles(UserRole.CASHIER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { userId: string; restaurantId: string },
  ) {
    return this.ordersService.create(dto, user.userId, user.restaurantId);
  }

  @Patch(':id/status')
  @Roles(UserRole.CASHIER, UserRole.COOK, UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: { restaurantId: string },
  ) {
    return this.ordersService.updateStatus(id, dto.status, user.restaurantId);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.CASHIER, UserRole.ADMIN)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: { restaurantId: string },
  ) {
    return this.ordersService.cancel(id, user.restaurantId);
  }

  @Post(':id/items')
  @Roles(UserRole.CASHIER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @Param('id') orderId: string,
    @Body() body: { productId: string; quantity: number; notes?: string },
    @CurrentUser() user: { restaurantId: string },
  ) {
    return this.ordersService.addItem(orderId, body, user.restaurantId);
  }

  @Delete(':id/items/:itemId')
  @Roles(UserRole.CASHIER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: { restaurantId: string },
  ) {
    return this.ordersService.removeItem(orderId, itemId, user.restaurantId);
  }
}

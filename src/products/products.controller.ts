import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('products')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@CurrentUser() user: { restaurantId: string }) {
    return this.productsService.findAll(user.restaurantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: { restaurantId: string }) {
    return this.productsService.findOne(id, user.restaurantId);
  }

  @Get(':id/ficha-tecnica')
  async getTechnicalSheet(@Param('id') id: string, @CurrentUser() user: { restaurantId: string }) {
    return this.productsService.getTechnicalSheet(id, user.restaurantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: { restaurantId: string },
  ) {
    return this.productsService.create(dto, user.restaurantId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: { restaurantId: string },
  ) {
    return this.productsService.update(id, dto, user.restaurantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: { restaurantId: string }) {
    return this.productsService.remove(id, user.restaurantId);
  }
}

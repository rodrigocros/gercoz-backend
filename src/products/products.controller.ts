import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('products')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll() { return this.productsService.findAll(); }

  @Get(':id')
  async findOne(@Param('id') id: string) { return this.productsService.findOne(id); }

  @Get(':id/ficha-tecnica')
  async getTechnicalSheet(@Param('id') id: string) { return this.productsService.getTechnicalSheet(id); }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductDto) { return this.productsService.create(dto); }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) { return this.productsService.update(id, dto); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) { return this.productsService.remove(id); }
}

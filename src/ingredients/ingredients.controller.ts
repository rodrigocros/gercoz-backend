import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@Controller('ingredients')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class IngredientsController {
  constructor(private ingredientsService: IngredientsService) {}

  @Get()
  async findAll(
    @Query() query: { isActive?: string; name?: string },
    @CurrentUser() user: { restaurantId: string },
  ) {
    const isActive = query.isActive !== undefined ? query.isActive === 'true' : undefined;
    return this.ingredientsService.findAll({ isActive, name: query.name }, user.restaurantId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { restaurantId: string },
  ) {
    return this.ingredientsService.findOne(id, user.restaurantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateIngredientDto,
    @CurrentUser() user: { userId: string; restaurantId: string },
  ) {
    return this.ingredientsService.create(dto, user.userId, user.restaurantId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIngredientDto,
    @CurrentUser() user: { userId: string; restaurantId: string },
  ) {
    return this.ingredientsService.update(id, dto, user.userId, user.restaurantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { restaurantId: string },
  ) {
    return this.ingredientsService.remove(id, user.restaurantId);
  }
}

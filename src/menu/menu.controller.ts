import { Controller, Get, Param, Patch, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('menu')
@UseGuards(RolesGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.COOK)
  async findAll(@CurrentUser() user: { restaurantId: string }) { return this.menuService.findAll(user.restaurantId); }

  @Get('categories/:categoryId')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async findByCategory(@Param('categoryId') categoryId: string, @CurrentUser() user: { restaurantId: string }) {
    return this.menuService.findByCategory(categoryId, user.restaurantId);
  }

  @Patch(':productId/toggle')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async toggle(@Param('productId') productId: string, @CurrentUser() user: { restaurantId: string }) {
    return this.menuService.toggle(productId, user.restaurantId);
  }
}

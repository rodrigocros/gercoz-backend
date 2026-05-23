import { Controller, Get, Param, Patch, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('menu')
@UseGuards(RolesGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CASHIER, UserRole.COOK)
  async findAll() { return this.menuService.findAll(); }

  @Get('categories/:categoryId')
  @Roles(UserRole.ADMIN, UserRole.CASHIER)
  async findByCategory(@Param('categoryId') categoryId: string) {
    return this.menuService.findByCategory(categoryId);
  }

  @Patch(':productId/toggle')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async toggle(@Param('productId') productId: string) {
    return this.menuService.toggle(productId);
  }
}

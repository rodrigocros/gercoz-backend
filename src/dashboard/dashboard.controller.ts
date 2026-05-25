import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('products')
  async getAllProducts(@CurrentUser() user: { restaurantId: string }) {
    return this.dashboardService.getAllProducts(user.restaurantId);
  }

  @Get('products/:id')
  async getOneProduct(@Param('id') id: string, @CurrentUser() user: { restaurantId: string }) {
    return this.dashboardService.getOneProduct(id, user.restaurantId);
  }

  @Get('summary')
  async getSummary(@CurrentUser() user: { restaurantId: string }) {
    return this.dashboardService.getSummary(user.restaurantId);
  }

  @Get('top-profitable')
  async getTopProfitable(@CurrentUser() user: { restaurantId: string }) {
    return this.dashboardService.getTopProfitable(user.restaurantId);
  }

  @Get('low-margin')
  async getLowMargin(@CurrentUser() user: { restaurantId: string }) {
    return this.dashboardService.getLowMargin(user.restaurantId);
  }
}

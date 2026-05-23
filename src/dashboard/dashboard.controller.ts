import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('dashboard')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('products')
  async getAllProducts() { return this.dashboardService.getAllProducts(); }

  @Get('products/:id')
  async getOneProduct(@Param('id') id: string) { return this.dashboardService.getOneProduct(id); }

  @Get('summary')
  async getSummary() { return this.dashboardService.getSummary(); }

  @Get('top-profitable')
  async getTopProfitable() { return this.dashboardService.getTopProfitable(); }

  @Get('low-margin')
  async getLowMargin() { return this.dashboardService.getLowMargin(); }
}

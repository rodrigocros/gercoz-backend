import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SelectEmpresaDto } from './dto/select-empresa.dto';
import { Public } from './decorators/public.decorator';
import { PartialJwtGuard } from './guards/partial-jwt.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @UseGuards(PartialJwtGuard)
  @Post('select-empresa')
  @HttpCode(HttpStatus.OK)
  selectEmpresa(
    @CurrentUser() user: { userId: string; name: string },
    @Body() dto: SelectEmpresaDto,
  ) {
    return this.authService.selectEmpresa(user.userId, user.name, dto.restaurantId);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('token') token: string) {
    return this.authService.refresh(token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body('token') token: string) {
    return this.authService.logout(token);
  }
}

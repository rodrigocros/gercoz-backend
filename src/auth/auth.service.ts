import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    const memberships = await this.prisma.userRestaurant.findMany({
      where: { userId: user.id },
      include: { restaurant: true },
    });

    if (memberships.length === 0) {
      throw new ForbiddenException('Usuário sem acesso a nenhuma empresa');
    }

    const partialToken = await this.jwt.signAsync(
      { sub: user.id, name: user.name, type: 'partial' },
      { expiresIn: '7d' },
    );

    const empresas = memberships.map((m) => ({
      id: m.restaurantId,
      nome: m.restaurant.name,
      role: m.role,
    }));

    return { partialToken, empresas };
  }

  async selectEmpresa(userId: string, userName: string, restaurantId: string) {
    const membership = await this.prisma.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    });
    if (!membership) throw new ForbiddenException('Acesso negado a esta empresa');

    return this.generateFullTokens(userId, userName, restaurantId, membership.role as string);
  }

  async refresh(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Invalid refresh token');
    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    const membership = await this.prisma.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: stored.userId, restaurantId: stored.restaurantId } },
    });

    if (!membership) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Membership revoked');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.generateFullTokens(
      stored.user.id,
      stored.user.name,
      stored.restaurantId,
      membership.role as string,
    );
  }

  async logout(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token } });
  }

  private async generateFullTokens(
    userId: string,
    userName: string,
    restaurantId: string,
    role: string,
  ) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, restaurantId, role, name: userName, type: 'full' },
      { expiresIn: '15m' },
    );

    const rawToken = randomBytes(40).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        restaurantId,
        token: rawToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken: rawToken };
  }
}

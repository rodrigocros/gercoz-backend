import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRestaurantDto) {
    const existing = await this.prisma.restaurant.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already taken`);

    const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);

    const restaurant = await this.prisma.$transaction(async (tx) => {
      const rest = await tx.restaurant.create({
        data: { name: dto.restaurantName, slug: dto.slug },
      });

      await tx.user.create({
        data: {
          restaurantId: rest.id,
          name: dto.adminName,
          email: dto.adminEmail,
          password: hashedPassword,
          role: UserRole.ADMIN,
        },
      });

      return rest;
    });

    return restaurant;
  }
}

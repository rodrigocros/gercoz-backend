import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateCategoryDto {
  @IsString() name: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto as any });
  }
}

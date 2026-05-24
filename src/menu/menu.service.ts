import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MenuItemDto, MenuCategoryDto } from './dto/menu-category.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<MenuItemDto[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      categoryId: p.categoryId,
      categoryName: p.category?.name ?? 'Sem Categoria',
      salePrice: p.salePrice,
      preparationTime: p.preparationTime,
      isActive: p.isActive,
    }));
  }

  async findByCategory(categoryId: string): Promise<MenuCategoryDto | null> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, categoryId },
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    if (products.length === 0) return null;

    const catName = products[0].category?.name ?? 'Sem Categoria';
    return {
      category: catName,
      products: products.map((p) => ({
        id: p.id, name: p.name, description: p.description,
        categoryId: p.categoryId, categoryName: catName,
        salePrice: p.salePrice, preparationTime: p.preparationTime, isActive: p.isActive,
      })),
    };
  }

  async toggle(productId: string): Promise<void> {
    const product = await this.prisma.product.findUniqueOrThrow({ where: { id: productId } });
    await this.prisma.product.update({
      where: { id: productId },
      data: { isActive: !product.isActive },
    });
  }
}

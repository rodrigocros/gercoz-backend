import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MenuCategoryDto } from './dto/menu-category.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<MenuCategoryDto[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });

    const grouped = products.reduce(
      (acc, product) => {
        const catName = product.category?.name ?? 'Sem Categoria';
        if (!acc[catName]) acc[catName] = { category: catName, products: [] };
        acc[catName].products.push({
          id: product.id,
          name: product.name,
          description: product.description,
          salePrice: product.salePrice,
          preparationTime: product.preparationTime,
          isActive: product.isActive,
        });
        return acc;
      },
      {} as Record<string, MenuCategoryDto>,
    );

    return Object.values(grouped);
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

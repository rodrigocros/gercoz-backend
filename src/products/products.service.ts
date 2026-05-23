import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export interface ProductMetrics {
  id: string;
  name: string;
  categoryName: string;
  costPrice: number;
  salePrice: number;
  margin: number;
  marginPct: number;
  roi: number;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async computeCost(productId: string): Promise<number> {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
      include: { recipeItems: { include: { ingredient: true } } },
    });
    return product.recipeItems.reduce(
      (sum, item) => sum + item.quantity * item.ingredient.costPrice,
      0,
    );
  }

  private calcMetrics(product: {
    id: string;
    name: string;
    salePrice: number;
    category?: { name: string } | null;
    recipeItems: { quantity: number; ingredient: { costPrice: number } }[];
  }): ProductMetrics {
    const costPrice = product.recipeItems.reduce(
      (sum, item) => sum + item.quantity * item.ingredient.costPrice,
      0,
    );
    const margin = product.salePrice - costPrice;
    const marginPct = product.salePrice > 0 ? (margin / product.salePrice) * 100 : 0;
    const roi = costPrice > 0 ? (margin / costPrice) * 100 : 0;
    return {
      id: product.id,
      name: product.name,
      categoryName: product.category?.name ?? 'Sem Categoria',
      costPrice,
      salePrice: product.salePrice,
      margin,
      marginPct,
      roi,
    };
  }

  async findAll(): Promise<ProductMetrics[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: true, recipeItems: { include: { ingredient: true } } },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => this.calcMetrics(p));
  }

  async findOne(id: string) {
    return this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: { category: true, recipeItems: { include: { ingredient: true } } },
    });
  }

  async getTechnicalSheet(id: string) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: { category: true, recipeItems: { include: { ingredient: true } } },
    });

    const ingredients = product.recipeItems.map((item) => {
      const unitCost = item.ingredient.costPrice;
      const partialCost = item.quantity * unitCost;
      return { name: item.ingredient.name, quantity: item.quantity, unit: item.unit, unitCost, partialCost };
    });

    const totalCost = ingredients.reduce((s, i) => s + i.partialCost, 0);
    const margin = product.salePrice - totalCost;
    const marginPct = product.salePrice > 0 ? (margin / product.salePrice) * 100 : 0;
    const roi = totalCost > 0 ? (margin / totalCost) * 100 : 0;

    return {
      name: product.name,
      categoryName: product.category?.name ?? 'Sem Categoria',
      preparationTime: product.preparationTime,
      description: product.description,
      ingredients,
      totalCost,
      salePrice: product.salePrice,
      margin,
      marginPct,
      roi,
    };
  }

  async create(dto: CreateProductDto) {
    const { recipeItems, ...productData } = dto;
    return this.prisma.$transaction(async (tx) => {
      return tx.product.create({
        data: {
          ...productData,
          recipeItems: {
            create: recipeItems.map((item) => ({
              ingredientId: item.ingredientId,
              quantity: item.quantity,
              unit: item.unit,
            })),
          },
        } as any,
        include: { category: true, recipeItems: { include: { ingredient: true } } },
      });
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const { recipeItems, ...productData } = dto;

    if (recipeItems !== undefined) {
      return this.prisma.$transaction(async (tx) => {
        await tx.recipeItem.deleteMany({ where: { productId: id } });
        return tx.product.update({
          where: { id },
          data: {
            ...productData,
            recipeItems: {
              create: recipeItems.map((item) => ({
                ingredientId: item.ingredientId,
                quantity: item.quantity,
                unit: item.unit,
              })),
            },
          } as any,
          include: { category: true, recipeItems: { include: { ingredient: true } } },
        });
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: productData as any,
      include: { category: true, recipeItems: { include: { ingredient: true } } },
    });
  }

  async remove(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

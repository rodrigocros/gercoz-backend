import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface ProductMetrics {
  id: string;
  name: string;
  categoryName: string;
  costPrice: number;
  salePrice: number;
  margin: number;
  marginPct: number;
  roi: number;
  classification: 'ALTO' | 'MEDIO' | 'BAIXO';
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private classify(marginPct: number): 'ALTO' | 'MEDIO' | 'BAIXO' {
    if (marginPct >= 50) return 'ALTO';
    if (marginPct >= 30) return 'MEDIO';
    return 'BAIXO';
  }

  private computeMetrics(product: {
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
      classification: this.classify(marginPct),
    };
  }

  async getAllProducts(restaurantId: string): Promise<ProductMetrics[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, restaurantId },
      include: { category: true, recipeItems: { include: { ingredient: true } } },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => this.computeMetrics(p));
  }

  async getOneProduct(id: string, restaurantId: string): Promise<ProductMetrics> {
    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId },
      include: { category: true, recipeItems: { include: { ingredient: true } } },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return this.computeMetrics(product);
  }

  async getSummary(restaurantId: string) {
    const metrics = await this.getAllProducts(restaurantId);
    const avgMarginPct = metrics.reduce((s, m) => s + m.marginPct, 0) / (metrics.length || 1);
    const avgRoi = metrics.reduce((s, m) => s + m.roi, 0) / (metrics.length || 1);
    const sorted = [...metrics].sort((a, b) => b.margin - a.margin);

    const ingredients = await this.prisma.ingredient.findMany({ where: { isActive: true, restaurantId } });
    const lowStock = ingredients.filter((i) => i.stock <= i.minStock);

    return {
      totalProducts: metrics.length,
      avgMarginPct: +avgMarginPct.toFixed(2),
      avgRoi: +avgRoi.toFixed(2),
      highMarginCount: metrics.filter((m) => m.classification === 'ALTO').length,
      mediumMarginCount: metrics.filter((m) => m.classification === 'MEDIO').length,
      lowMarginCount: metrics.filter((m) => m.classification === 'BAIXO').length,
      mostProfitableProduct: sorted[0] ? { name: sorted[0].name, margin: sorted[0].margin, roi: sorted[0].roi } : null,
      leastProfitableProduct: sorted[sorted.length - 1] ? { name: sorted[sorted.length - 1].name, margin: sorted[sorted.length - 1].margin, roi: sorted[sorted.length - 1].roi } : null,
      ingredientsLowStock: lowStock,
    };
  }

  async getTopProfitable(restaurantId: string): Promise<ProductMetrics[]> {
    const metrics = await this.getAllProducts(restaurantId);
    return [...metrics].sort((a, b) => b.margin - a.margin).slice(0, 5);
  }

  async getLowMargin(restaurantId: string): Promise<ProductMetrics[]> {
    const metrics = await this.getAllProducts(restaurantId);
    return metrics.filter((m) => m.marginPct < 30);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../common/prisma.service';

const mockPrisma = {
  product: { findMany: jest.fn(), findUniqueOrThrow: jest.fn() },
  ingredient: { findMany: jest.fn() },
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<DashboardService>(DashboardService);
  });

  describe('classify', () => {
    it('returns ALTO for marginPct >= 50', () => {
      expect((service as any).classify(50)).toBe('ALTO');
      expect((service as any).classify(75)).toBe('ALTO');
    });
    it('returns MEDIO for 30 <= marginPct < 50', () => {
      expect((service as any).classify(30)).toBe('MEDIO');
      expect((service as any).classify(49.9)).toBe('MEDIO');
    });
    it('returns BAIXO for marginPct < 30', () => {
      expect((service as any).classify(0)).toBe('BAIXO');
      expect((service as any).classify(29.9)).toBe('BAIXO');
    });
  });

  describe('computeMetrics', () => {
    it('correctly computes costPrice, margin, marginPct, roi and classification', () => {
      const product = {
        id: 'p1', name: 'Test', salePrice: 20, category: { name: 'Cat' },
        recipeItems: [{ quantity: 2, ingredient: { costPrice: 5 } }, { quantity: 0.5, ingredient: { costPrice: 4 } }],
      };
      const result = (service as any).computeMetrics(product);
      expect(result.costPrice).toBeCloseTo(12);
      expect(result.margin).toBeCloseTo(8);
      expect(result.marginPct).toBeCloseTo(40);
      expect(result.roi).toBeCloseTo(66.67, 1);
      expect(result.classification).toBe('MEDIO');
    });

    it('handles zero salePrice gracefully (marginPct = 0)', () => {
      const product = { id: 'p2', name: 'Free', salePrice: 0, category: null, recipeItems: [{ quantity: 1, ingredient: { costPrice: 5 } }] };
      const result = (service as any).computeMetrics(product);
      expect(result.marginPct).toBe(0);
      expect(result.categoryName).toBe('Sem Categoria');
    });

    it('handles zero costPrice gracefully (roi = 0)', () => {
      const product = { id: 'p3', name: 'NoCost', salePrice: 10, category: { name: 'Cat' }, recipeItems: [] };
      const result = (service as any).computeMetrics(product);
      expect(result.costPrice).toBe(0);
      expect(result.roi).toBe(0);
    });
  });

  describe('getAllProducts', () => {
    it('maps prisma products to ProductMetrics', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{
        id: 'p1', name: 'Pizza', salePrice: 45, category: { name: 'Pizzas' },
        recipeItems: [{ quantity: 0.4, ingredient: { costPrice: 4.5 } }],
      }]);
      const result = await service.getAllProducts();
      expect(result).toHaveLength(1);
      expect(result[0].costPrice).toBeCloseTo(1.8);
    });
  });

  describe('getSummary', () => {
    it('returns correct high/medium/low counts', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'High', salePrice: 100, category: { name: 'C' }, recipeItems: [{ quantity: 1, ingredient: { costPrice: 40 } }] },
        { id: 'p2', name: 'Medium', salePrice: 100, category: { name: 'C' }, recipeItems: [{ quantity: 1, ingredient: { costPrice: 65 } }] },
        { id: 'p3', name: 'Low', salePrice: 100, category: { name: 'C' }, recipeItems: [{ quantity: 1, ingredient: { costPrice: 80 } }] },
      ]);
      mockPrisma.ingredient.findMany.mockResolvedValue([]);
      const summary = await service.getSummary();
      expect(summary.totalProducts).toBe(3);
      expect(summary.highMarginCount).toBe(1);
      expect(summary.mediumMarginCount).toBe(1);
      expect(summary.lowMarginCount).toBe(1);
    });

    it('identifies low stock ingredients', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.ingredient.findMany.mockResolvedValue([
        { id: 'i1', name: 'Flour', stock: 2, minStock: 5 },
        { id: 'i2', name: 'Salt', stock: 10, minStock: 1 },
      ]);
      const summary = await service.getSummary();
      expect(summary.ingredientsLowStock).toHaveLength(1);
      expect(summary.ingredientsLowStock[0].name).toBe('Flour');
    });
  });

  describe('getTopProfitable', () => {
    it('returns top 5 products sorted by margin descending', async () => {
      const makeProduct = (id: string, margin: number) => ({
        id, name: `Prod ${id}`, salePrice: 100, category: { name: 'C' },
        recipeItems: [{ quantity: 1, ingredient: { costPrice: 100 - margin } }],
      });
      mockPrisma.product.findMany.mockResolvedValue([
        makeProduct('p1', 10), makeProduct('p2', 50), makeProduct('p3', 30),
        makeProduct('p4', 70), makeProduct('p5', 20), makeProduct('p6', 60),
      ]);
      const result = await service.getTopProfitable();
      expect(result).toHaveLength(5);
      expect(result[0].margin).toBeCloseTo(70);
      expect(result[1].margin).toBeCloseTo(60);
    });
  });
});

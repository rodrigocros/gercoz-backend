import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../common/prisma.service';

const mockPrisma = {
  product: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  recipeItem: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ProductsService>(ProductsService);
  });

  describe('computeCost', () => {
    it('sums quantity * costPrice for all recipe items', async () => {
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue({
        id: 'prod-1',
        recipeItems: [
          { quantity: 0.5, ingredient: { costPrice: 10 } },
          { quantity: 2, ingredient: { costPrice: 3 } },
        ],
      });
      const cost = await service.computeCost('prod-1');
      expect(cost).toBe(11); // 0.5*10 + 2*3
    });

    it('returns 0 when there are no recipe items', async () => {
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue({ id: 'prod-2', recipeItems: [] });
      const cost = await service.computeCost('prod-2');
      expect(cost).toBe(0);
    });
  });

  describe('create', () => {
    it('creates product with recipe items in a transaction', async () => {
      const dto = {
        name: 'Pizza Margherita', salePrice: 45.0,
        recipeItems: [{ ingredientId: 'ing-1', quantity: 0.4, unit: 'KG' }],
      };
      const createdProduct = { id: 'prod-new', ...dto };
      mockPrisma.$transaction.mockImplementation(async (fn: any) =>
        fn({ product: { create: jest.fn().mockResolvedValue(createdProduct) } })
      );
      const result = await service.create(dto as any);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual(createdProduct);
    });
  });

  describe('findAll', () => {
    it('computes margin, marginPct and roi for each product', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{
        id: 'p1', name: 'X-Burguer', salePrice: 18,
        category: { name: 'Lanches' },
        recipeItems: [
          { quantity: 1, ingredient: { costPrice: 1.5 } },
          { quantity: 0.1, ingredient: { costPrice: 35 } },
        ],
      }]);
      const result = await service.findAll();
      expect(result[0].costPrice).toBeCloseTo(5);
      expect(result[0].margin).toBeCloseTo(13);
      expect(result[0].marginPct).toBeCloseTo(72.22, 1);
      expect(result[0].roi).toBeCloseTo(260);
    });
  });

  describe('update', () => {
    it('deletes and recreates recipe items when recipeItems is provided', async () => {
      const dto = { name: 'Updated', recipeItems: [{ ingredientId: 'ing-1', quantity: 1, unit: 'UN' }] };
      mockPrisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          recipeItem: { deleteMany: jest.fn() },
          product: { update: jest.fn().mockResolvedValue({ id: 'prod-1', ...dto }) },
        })
      );
      const result = await service.update('prod-1', dto as any);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('soft deletes product by setting isActive=false', async () => {
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-1', isActive: false });
      await service.remove('prod-1');
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { isActive: false },
      });
    });
  });
});

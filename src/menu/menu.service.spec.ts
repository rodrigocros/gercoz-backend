import { Test, TestingModule } from '@nestjs/testing';
import { MenuService } from './menu.service';
import { PrismaService } from '../common/prisma.service';

const mockPrisma = {
  product: { findMany: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn() },
};

describe('MenuService', () => {
  let service: MenuService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [MenuService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<MenuService>(MenuService);
  });

  describe('findAll', () => {
    it('groups active products by category', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'X-Burguer', description: null, salePrice: 18, preparationTime: 15, isActive: true, category: { name: 'Lanches' } },
        { id: 'p2', name: 'Pizza', description: null, salePrice: 45, preparationTime: 25, isActive: true, category: { name: 'Pizzas' } },
        { id: 'p3', name: 'X-Salada', description: null, salePrice: 20, preparationTime: 12, isActive: true, category: { name: 'Lanches' } },
      ]);
      const result = await service.findAll();
      expect(result).toHaveLength(2);
      const lanches = result.find((c) => c.category === 'Lanches');
      expect(lanches).toBeDefined();
      expect(lanches!.products).toHaveLength(2);
    });

    it('only returns active products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Active', description: null, salePrice: 10, preparationTime: 5, isActive: true, category: { name: 'Cat' } },
      ]);
      await service.findAll();
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
    });

    it('assigns "Sem Categoria" for products without a category', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Orphan', description: null, salePrice: 5, preparationTime: 5, isActive: true, category: null },
      ]);
      const result = await service.findAll();
      expect(result[0].category).toBe('Sem Categoria');
    });
  });

  describe('toggle', () => {
    it('flips isActive from true to false', async () => {
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue({ id: 'p1', isActive: true });
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', isActive: false });
      await service.toggle('p1');
      expect(mockPrisma.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { isActive: false } });
    });

    it('flips isActive from false to true', async () => {
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue({ id: 'p1', isActive: false });
      mockPrisma.product.update.mockResolvedValue({ id: 'p1', isActive: true });
      await service.toggle('p1');
      expect(mockPrisma.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { isActive: true } });
    });
  });
});

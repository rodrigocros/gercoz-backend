import { Test, TestingModule } from '@nestjs/testing';
import { IngredientsService } from './ingredients.service';
import { PrismaService } from '../common/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { Unit } from '@prisma/client';

const existingIngredient = {
  id: 'ing-1', restaurantId: 'rest-1', name: 'Flour',
  unit: Unit.KG, costPrice: 2.5, stock: 10, minStock: 2,
  isActive: true, description: null, supplier: null,
  expiryDate: null, createdAt: new Date(), updatedAt: new Date(),
};

const mockPrisma = {
  ingredient: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  ingredientPriceHistory: { create: jest.fn() },
};

const mockEventEmitter = { emit: jest.fn() };

describe('IngredientsService', () => {
  let service: IngredientsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngredientsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();
    service = module.get<IngredientsService>(IngredientsService);
  });

  describe('update', () => {
    it('should emit ingredient.price_updated when costPrice changes', async () => {
      mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);
      mockPrisma.ingredient.update.mockResolvedValue({ ...existingIngredient, costPrice: 3.5 });
      mockPrisma.ingredientPriceHistory.create.mockResolvedValue({});
      await service.update('ing-1', { costPrice: 3.5 }, 'user-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ingredient.price_updated', { ingredientId: 'ing-1', newCostPrice: 3.5 });
    });

    it('should create IngredientPriceHistory when costPrice changes', async () => {
      mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);
      mockPrisma.ingredient.update.mockResolvedValue({ ...existingIngredient, costPrice: 4.0 });
      mockPrisma.ingredientPriceHistory.create.mockResolvedValue({});
      await service.update('ing-1', { costPrice: 4.0 }, 'user-1');
      expect(mockPrisma.ingredientPriceHistory.create).toHaveBeenCalledWith({
        data: { ingredientId: 'ing-1', price: 4.0, changedBy: 'user-1' },
      });
    });

    it('should NOT emit event when costPrice is unchanged', async () => {
      mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);
      mockPrisma.ingredient.update.mockResolvedValue(existingIngredient);
      await service.update('ing-1', { name: 'Wheat Flour' }, 'user-1');
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      expect(mockPrisma.ingredientPriceHistory.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if ingredient does not exist', async () => {
      mockPrisma.ingredient.findFirst.mockResolvedValue(null);
      await expect(service.update('bad-id', { name: 'X' }, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete ingredient by setting isActive=false', async () => {
      mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);
      mockPrisma.ingredient.update.mockResolvedValue({ ...existingIngredient, isActive: false });
      await service.remove('ing-1');
      expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({ where: { id: 'ing-1' }, data: { isActive: false } });
    });

    it('should throw NotFoundException if ingredient does not exist', async () => {
      mockPrisma.ingredient.findFirst.mockResolvedValue(null);
      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});

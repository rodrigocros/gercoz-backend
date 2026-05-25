import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../common/prisma.service';
import { OrdersGateway } from './orders.gateway';
import { OrderType, OrderStatus } from '@prisma/client';

const mockPrisma = {
  order: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  product: { findMany: jest.fn(), findFirst: jest.fn() },
  orderItem: { create: jest.fn(), delete: jest.fn() },
  $transaction: jest.fn(),
};

const mockGateway = { emitOrderCreated: jest.fn(), emitStatusChanged: jest.fn() };

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrdersGateway, useValue: mockGateway },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    it('throws BadRequestException if type=MESA without tableNumber', async () => {
      await expect(service.create({ type: OrderType.MESA, items: [] } as any, 'user-1', 'rest-1'))
        .rejects.toThrow(BadRequestException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('generates orderNumber as MAX + 1 per restaurant', async () => {
      const createdOrder = { id: 'order-new', orderNumber: 6, type: OrderType.BALCAO, items: [] };
      mockPrisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          order: { findFirst: jest.fn().mockResolvedValue({ orderNumber: 5 }), create: jest.fn().mockResolvedValue(createdOrder) },
          product: { findMany: jest.fn().mockResolvedValue([]) },
        })
      );
      const result = await service.create({ type: OrderType.BALCAO, items: [] } as any, 'user-1', 'rest-1');
      expect(result.orderNumber).toBe(6);
    });

    it('starts orderNumber at 1 when no previous orders exist', async () => {
      const createdOrder = { id: 'order-1', orderNumber: 1, items: [] };
      mockPrisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          order: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(createdOrder) },
          product: { findMany: jest.fn().mockResolvedValue([]) },
        })
      );
      const result = await service.create({ type: OrderType.BALCAO, items: [] } as any, 'user-1', 'rest-1');
      expect(result.orderNumber).toBe(1);
    });

    it('snapshots unitPrice from product.salePrice', async () => {
      let capturedCreateData: any;
      mockPrisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          order: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((args: any) => { capturedCreateData = args.data; return Promise.resolve({ id: 'o1', orderNumber: 1, items: [] }); }),
          },
          product: { findMany: jest.fn().mockResolvedValue([{ id: 'prod-1', salePrice: 25.0 }]) },
        })
      );
      await service.create({ type: OrderType.BALCAO, items: [{ productId: 'prod-1', quantity: 2 }] } as any, 'user-1', 'rest-1');
      expect(capturedCreateData.items.create[0].unitPrice).toBe(25.0);
    });

    it('emits order:created event after creation', async () => {
      const createdOrder = { id: 'o1', orderNumber: 1, items: [] };
      mockPrisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          order: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(createdOrder) },
          product: { findMany: jest.fn().mockResolvedValue([]) },
        })
      );
      await service.create({ type: OrderType.BALCAO, items: [] } as any, 'user-1', 'rest-1');
      expect(mockGateway.emitOrderCreated).toHaveBeenCalledWith('rest-1', createdOrder);
    });
  });

  describe('findAll', () => {
    it('passes restaurantId to prisma where clause', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      await service.findAll({}, 'rest-1');
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ restaurantId: 'rest-1' }) }),
      );
    });
  });

  describe('updateStatus', () => {
    it('sets closedAt when status is DELIVERED', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'o1', status: OrderStatus.PREPARING });
      mockPrisma.order.update.mockResolvedValue({ id: 'o1', status: OrderStatus.DELIVERED, closedAt: new Date() });
      await service.updateStatus('o1', OrderStatus.DELIVERED, 'rest-1');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: OrderStatus.DELIVERED, closedAt: expect.any(Date) }),
      }));
    });

    it('does not set closedAt for non-terminal statuses', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'o1', status: OrderStatus.PENDING });
      mockPrisma.order.update.mockResolvedValue({ id: 'o1', status: OrderStatus.PREPARING });
      await service.updateStatus('o1', OrderStatus.PREPARING, 'rest-1');
      const callData = mockPrisma.order.update.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('closedAt');
    });

    it('throws NotFoundException when order not in restaurant', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);
      await expect(service.updateStatus('o1', OrderStatus.PREPARING, 'rest-other')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('cancels a PENDING order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'o1', status: OrderStatus.PENDING });
      mockPrisma.order.update.mockResolvedValue({ id: 'o1', status: OrderStatus.CANCELLED });
      await service.cancel('o1', 'rest-1');
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { status: OrderStatus.CANCELLED, closedAt: expect.any(Date) },
      });
    });

    it('throws BadRequestException when cancelling a non-PENDING order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'o1', status: OrderStatus.PREPARING });
      await expect(service.cancel('o1', 'rest-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when order not in restaurant', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);
      await expect(service.cancel('o1', 'rest-other')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });
});

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { OrdersGateway } from './orders.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, OrderType } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: OrdersGateway,
  ) {}

  async create(dto: CreateOrderDto, userId: string, restaurantId: string) {
    if (dto.type === OrderType.MESA && !dto.tableNumber) {
      throw new BadRequestException('tableNumber is required for MESA orders');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const last = await tx.order.findFirst({
        where: { restaurantId },
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      });
      const orderNumber = (last?.orderNumber ?? 0) + 1;

      const productIds = dto.items.map((i) => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const priceMap = new Map(products.map((p) => [p.id, p.salePrice]));

      return tx.order.create({
        data: {
          restaurantId,
          orderNumber,
          type: dto.type,
          tableNumber: dto.tableNumber,
          notes: dto.notes,
          discount: dto.discount ?? 0,
          createdBy: userId,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: priceMap.get(item.productId) ?? 0,
              notes: item.notes,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });
    });

    this.gateway.emitOrderCreated(restaurantId, order);
    return order;
  }

  private mapOrder(order: any) {
    const items = order.items.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      name: item.product?.name ?? '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes,
    }));
    const subtotal = items.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0);
    const discount = order.discount ?? 0;
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      type: order.type,
      tableNumber: order.tableNumber,
      status: order.status,
      notes: order.notes,
      items,
      subtotal,
      discount,
      total: subtotal - discount,
      createdAt: order.createdAt,
      closedAt: order.closedAt,
    };
  }

  async findAll(filters: { status?: OrderStatus; type?: OrderType }, restaurantId: string) {
    const where: any = { restaurantId };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    const orders = await this.prisma.order.findMany({
      where,
      include: { items: { include: { product: true } } },
      orderBy: { orderNumber: 'desc' },
    });
    return orders.map((o) => this.mapOrder(o));
  }

  async findOne(id: string, restaurantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, restaurantId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return this.mapOrder(order);
  }

  async updateStatus(id: string, status: OrderStatus, restaurantId: string) {
    const order = await this.prisma.order.findFirst({ where: { id, restaurantId } });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    const isTerminal = status === OrderStatus.DELIVERED;
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status, ...(isTerminal ? { closedAt: new Date() } : {}) },
    });
    this.gateway.emitStatusChanged(restaurantId, updated);
    return updated;
  }

  async cancel(id: string, restaurantId: string) {
    const order = await this.prisma.order.findFirst({ where: { id, restaurantId } });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only PENDING orders can be cancelled');
    }
    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED, closedAt: new Date() },
    });
  }

  async addItem(orderId: string, item: { productId: string; quantity: number; notes?: string }, restaurantId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    const product = await this.prisma.product.findUniqueOrThrow({ where: { id: item.productId } });
    return this.prisma.orderItem.create({
      data: { orderId, productId: item.productId, quantity: item.quantity, unitPrice: product.salePrice, notes: item.notes },
      include: { product: true },
    });
  }

  async removeItem(orderId: string, itemId: string, restaurantId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return this.prisma.orderItem.delete({ where: { id: itemId, orderId } });
  }
}

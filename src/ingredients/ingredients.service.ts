import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@Injectable()
export class IngredientsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(query: { isActive?: boolean; name?: string }) {
    return this.prisma.ingredient.findMany({
      where: {
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.name ? { name: { contains: query.name } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id },
      include: { priceHistory: { orderBy: { changedAt: 'desc' }, take: 10 } },
    });
    if (!ingredient) throw new NotFoundException(`Ingredient ${id} not found`);
    return ingredient;
  }

  async create(dto: CreateIngredientDto, _userId: string) {
    return this.prisma.ingredient.create({ data: dto as any });
  }

  async update(id: string, dto: UpdateIngredientDto, userId: string) {
    const existing = await this.prisma.ingredient.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException(`Ingredient ${id} not found`);

    const dtoAny = dto as any;
    const priceChanged =
      dtoAny.costPrice !== undefined && dtoAny.costPrice !== existing.costPrice;

    const updated = await this.prisma.ingredient.update({
      where: { id },
      data: dto as any,
    });

    if (priceChanged) {
      await this.prisma.ingredientPriceHistory.create({
        data: { ingredientId: id, price: dtoAny.costPrice, changedBy: userId },
      });
      this.eventEmitter.emit('ingredient.price_updated', {
        ingredientId: id,
        newCostPrice: dtoAny.costPrice,
      });
    }

    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.ingredient.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException(`Ingredient ${id} not found`);
    return this.prisma.ingredient.update({ where: { id }, data: { isActive: false } });
  }
}

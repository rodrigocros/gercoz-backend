import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { tenantStorage } from './tenant.context';
import * as path from 'path';

const TENANT_MODELS = new Set([
  'User', 'Ingredient', 'IngredientPriceHistory', 'Category',
  'Product', 'RecipeItem', 'Order', 'OrderItem', 'RefreshToken',
]);

function createAdapter(): PrismaBetterSqlite3 {
  const dbUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
  // Convert file: URL to a path that better-sqlite3 understands
  const dbPath = dbUrl.startsWith('file:')
    ? path.resolve(process.cwd(), dbUrl.slice('file:'.length))
    : dbUrl;
  return new PrismaBetterSqlite3({ url: dbPath });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: createAdapter() });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Helper to inject tenant filter into query args
  withTenant<T extends { where?: any }>(model: string, args: T): T {
    const ctx = tenantStorage.getStore();
    if (!ctx?.restaurantId || !TENANT_MODELS.has(model)) return args;
    return {
      ...args,
      where: { ...(args.where ?? {}), restaurantId: ctx.restaurantId },
    };
  }
}

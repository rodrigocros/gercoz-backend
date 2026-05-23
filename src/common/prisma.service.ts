import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { tenantStorage } from './tenant.context';

const TENANT_MODELS = new Set([
  'User',
  'Ingredient',
  'IngredientPriceHistory',
  'Category',
  'Product',
  'RecipeItem',
  'Order',
  'OrderItem',
  'RefreshToken',
]);

function resolveDbPath(url: string): string {
  // Prisma SQLite URLs are like "file:./dev.db" — strip the "file:" prefix
  return url.startsWith('file:') ? url.slice('file:'.length) : url;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const dbPath = resolveDbPath(process.env.DATABASE_URL ?? 'file:./dev.db');
    super({ adapter: new PrismaBetterSqlite3({ url: dbPath }) });
  }

  async onModuleInit() {
    await this.$connect();
    const extended = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const ctx = tenantStorage.getStore();
            if (ctx?.restaurantId && model && TENANT_MODELS.has(model)) {
              (args as any).where = {
                ...((args as any).where ?? {}),
                restaurantId: ctx.restaurantId,
              };
            }
            return query(args);
          },
        },
      },
    });
    Object.assign(this, extended);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

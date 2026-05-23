import 'dotenv/config';
import {
  PrismaClient,
  Unit,
  UserRole,
  OrderType,
  OrderStatus,
} from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as bcrypt from 'bcryptjs';

function resolveDbPath(url: string): string {
  return url.startsWith('file:') ? url.slice('file:'.length) : url;
}

const dbPath = resolveDbPath(process.env.DATABASE_URL ?? 'file:./dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting seed...');

  // ── Restaurant ────────────────────────────────────────────────────────────
  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Restaurante Demo',
      slug: 'demo',
      phone: '(11) 99999-9999',
      address: 'Rua Demo, 123',
    },
  });
  console.log(`Restaurant created: ${restaurant.name} (${restaurant.id})`);

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 10);
  const cashierPassword = await bcrypt.hash('cashier123', 10);
  const cookPassword = await bcrypt.hash('cook123', 10);

  const admin = await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Admin',
      email: 'admin@demo.com',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const cashier = await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Caixa',
      email: 'caixa@demo.com',
      password: cashierPassword,
      role: UserRole.CASHIER,
    },
  });

  await prisma.user.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Cozinheiro',
      email: 'cozinha@demo.com',
      password: cookPassword,
      role: UserRole.COOK,
    },
  });

  console.log('Users created: admin, cashier, cook');

  // ── Ingredients (12) ──────────────────────────────────────────────────────
  const ingredients = await Promise.all([
    prisma.ingredient.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Farinha de trigo',
        unit: Unit.KG,
        costPrice: 4.5,
        supplier: 'Moinho',
        stock: 20,
        minStock: 5,
      },
    }),
    prisma.ingredient.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Ovo',
        unit: Unit.UN,
        costPrice: 0.8,
        supplier: 'Granja',
        stock: 100,
        minStock: 20,
      },
    }),
    prisma.ingredient.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Leite',
        unit: Unit.L,
        costPrice: 4.0,
        supplier: 'Laticínios',
        stock: 10,
        minStock: 3,
      },
    }),
    prisma.ingredient.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Manteiga',
        unit: Unit.KG,
        costPrice: 28.0,
        supplier: 'Laticínios',
        stock: 5,
        minStock: 1,
      },
    }),
    prisma.ingredient.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Açúcar',
        unit: Unit.KG,
        costPrice: 3.5,
        supplier: 'Usina',
        stock: 10,
        minStock: 2,
      },
    }),
    prisma.ingredient.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Sal',
        unit: Unit.KG,
        costPrice: 2.0,
        supplier: 'Salinas',
        stock: 5,
        minStock: 1,
      },
    }),
    prisma.ingredient.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Queijo muçarela',
        unit: Unit.KG,
        costPrice: 35.0,
        supplier: 'Laticínios',
        stock: 8,
        minStock: 2,
      },
    }),
    prisma.ingredient.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Presunto',
        unit: Unit.KG,
        costPrice: 25.0,
        supplier: 'Frigorífico',
        stock: 5,
        minStock: 1,
      },
    }),
    prisma.ingredient.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Tomate',
        unit: Unit.KG,
        costPrice: 6.0,
        supplier: 'Hortifruti',
        stock: 10,
        minStock: 2,
      },
    }),
    prisma.ingredient.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Alface',
        unit: Unit.UN,
        costPrice: 2.5,
        supplier: 'Hortifruti',
        stock: 30,
        minStock: 10,
      },
    }),
    prisma.ingredient.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Peito de frango',
        unit: Unit.KG,
        costPrice: 18.0,
        supplier: 'Frigorífico',
        stock: 15,
        minStock: 3,
      },
    }),
    prisma.ingredient.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Pão de hambúrguer',
        unit: Unit.UN,
        costPrice: 1.5,
        supplier: 'Padaria',
        stock: 50,
        minStock: 10,
      },
    }),
  ]);

  const [
    ingFarinha,
    ingOvo,
    ingLeite,
    ingManteiga,
    ingAcucar,
    ingSal,
    ingQueijo,
    ingPresunto,
    ingTomate,
    ingAlface,
    ingFrango,
    ingPao,
  ] = ingredients;

  // ── Price History (1 entry per ingredient) ────────────────────────────────
  await Promise.all(
    ingredients.map((ing) =>
      prisma.ingredientPriceHistory.create({
        data: {
          ingredientId: ing.id,
          price: ing.costPrice,
          changedBy: admin.id,
        },
      }),
    ),
  );

  console.log(`Ingredients created: ${ingredients.length}`);

  // ── Categories (4) ────────────────────────────────────────────────────────
  const [catLanches, catPizzas, catBebidas, catSobremesas] = await Promise.all([
    prisma.category.create({
      data: { restaurantId: restaurant.id, name: 'Lanches', sortOrder: 1 },
    }),
    prisma.category.create({
      data: { restaurantId: restaurant.id, name: 'Pizzas', sortOrder: 2 },
    }),
    prisma.category.create({
      data: { restaurantId: restaurant.id, name: 'Bebidas', sortOrder: 3 },
    }),
    prisma.category.create({
      data: { restaurantId: restaurant.id, name: 'Sobremesas', sortOrder: 4 },
    }),
  ]);

  console.log('Categories created: Lanches, Pizzas, Bebidas, Sobremesas');

  // ── Products + RecipeItems (12) ───────────────────────────────────────────
  type RecipeEntry = {
    ing: typeof ingFarinha;
    qty: number;
    unit: Unit;
  };

  const productData: Array<{
    name: string;
    categoryId: string;
    salePrice: number;
    preparationTime: number;
    recipe: RecipeEntry[];
  }> = [
    // Lanches
    {
      name: 'X-Burguer',
      categoryId: catLanches.id,
      salePrice: 18.0,
      preparationTime: 15,
      recipe: [
        { ing: ingPao, qty: 1, unit: Unit.UN },
        { ing: ingQueijo, qty: 0.1, unit: Unit.KG },
        { ing: ingTomate, qty: 0.1, unit: Unit.KG },
      ],
    },
    {
      name: 'X-Bacon',
      categoryId: catLanches.id,
      salePrice: 22.0,
      preparationTime: 15,
      recipe: [
        { ing: ingPao, qty: 1, unit: Unit.UN },
        { ing: ingQueijo, qty: 0.1, unit: Unit.KG },
        { ing: ingPresunto, qty: 0.1, unit: Unit.KG },
        { ing: ingTomate, qty: 0.05, unit: Unit.KG },
      ],
    },
    {
      name: 'X-Salada',
      categoryId: catLanches.id,
      salePrice: 20.0,
      preparationTime: 12,
      recipe: [
        { ing: ingPao, qty: 1, unit: Unit.UN },
        { ing: ingAlface, qty: 1, unit: Unit.UN },
        { ing: ingTomate, qty: 0.1, unit: Unit.KG },
      ],
    },
    // Pizzas
    {
      name: 'Pizza Margherita',
      categoryId: catPizzas.id,
      salePrice: 45.0,
      preparationTime: 25,
      recipe: [
        { ing: ingFarinha, qty: 0.4, unit: Unit.KG },
        { ing: ingQueijo, qty: 0.2, unit: Unit.KG },
        { ing: ingTomate, qty: 0.3, unit: Unit.KG },
        { ing: ingSal, qty: 0.01, unit: Unit.KG },
      ],
    },
    {
      name: 'Pizza Frango',
      categoryId: catPizzas.id,
      salePrice: 52.0,
      preparationTime: 25,
      recipe: [
        { ing: ingFarinha, qty: 0.4, unit: Unit.KG },
        { ing: ingFrango, qty: 0.3, unit: Unit.KG },
        { ing: ingQueijo, qty: 0.2, unit: Unit.KG },
      ],
    },
    {
      name: 'Pizza Calabresa',
      categoryId: catPizzas.id,
      salePrice: 48.0,
      preparationTime: 25,
      recipe: [
        { ing: ingFarinha, qty: 0.4, unit: Unit.KG },
        { ing: ingQueijo, qty: 0.2, unit: Unit.KG },
        { ing: ingTomate, qty: 0.2, unit: Unit.KG },
      ],
    },
    // Bebidas
    {
      name: 'Suco de Laranja',
      categoryId: catBebidas.id,
      salePrice: 10.0,
      preparationTime: 5,
      recipe: [{ ing: ingAcucar, qty: 0.05, unit: Unit.KG }],
    },
    {
      name: 'Refrigerante',
      categoryId: catBebidas.id,
      salePrice: 7.0,
      preparationTime: 2,
      recipe: [],
    },
    {
      name: 'Água',
      categoryId: catBebidas.id,
      salePrice: 4.0,
      preparationTime: 1,
      recipe: [],
    },
    // Sobremesas
    {
      name: 'Brigadeiro',
      categoryId: catSobremesas.id,
      salePrice: 5.0,
      preparationTime: 10,
      recipe: [
        { ing: ingLeite, qty: 0.1, unit: Unit.L },
        { ing: ingAcucar, qty: 0.05, unit: Unit.KG },
        { ing: ingManteiga, qty: 0.02, unit: Unit.KG },
      ],
    },
    {
      name: 'Pudim',
      categoryId: catSobremesas.id,
      salePrice: 12.0,
      preparationTime: 60,
      recipe: [
        { ing: ingLeite, qty: 0.5, unit: Unit.L },
        { ing: ingOvo, qty: 3, unit: Unit.UN },
        { ing: ingAcucar, qty: 0.15, unit: Unit.KG },
      ],
    },
    {
      name: 'Petit Gâteau',
      categoryId: catSobremesas.id,
      salePrice: 18.0,
      preparationTime: 20,
      recipe: [
        { ing: ingFarinha, qty: 0.1, unit: Unit.KG },
        { ing: ingOvo, qty: 2, unit: Unit.UN },
        { ing: ingManteiga, qty: 0.08, unit: Unit.KG },
        { ing: ingAcucar, qty: 0.1, unit: Unit.KG },
      ],
    },
  ];

  const products: Array<{ id: string; salePrice: number }> = [];

  for (const p of productData) {
    const product = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        name: p.name,
        categoryId: p.categoryId,
        salePrice: p.salePrice,
        preparationTime: p.preparationTime,
        recipeItems: {
          create: p.recipe.map((r) => ({
            ingredientId: r.ing.id,
            quantity: r.qty,
            unit: r.unit,
          })),
        },
      },
      select: { id: true, salePrice: true },
    });
    products.push(product);
  }

  console.log(`Products created: ${products.length}`);

  // ── Orders (12) ───────────────────────────────────────────────────────────
  const statuses: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.DELIVERED,
  ];

  for (let i = 0; i < 12; i++) {
    const isMesa = i % 2 === 0;
    const product1 = products[i % products.length];
    const product2 = products[(i + 3) % products.length];
    const status = statuses[i % statuses.length];
    const isDelivered = status === OrderStatus.DELIVERED;

    await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        orderNumber: i + 1,
        type: isMesa ? OrderType.MESA : OrderType.BALCAO,
        tableNumber: isMesa ? (i % 8) + 1 : undefined,
        status,
        closedAt: isDelivered ? new Date() : undefined,
        createdBy: cashier.id,
        items: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              unitPrice: product1.salePrice,
            },
            {
              productId: product2.id,
              quantity: 2,
              unitPrice: product2.salePrice,
            },
          ],
        },
      },
    });
  }

  console.log('Orders created: 12');
  console.log('');
  console.log('Seed completed successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Admin:   admin@demo.com   / admin123');
  console.log('  Cashier: caixa@demo.com   / cashier123');
  console.log('  Cook:    cozinha@demo.com / cook123');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

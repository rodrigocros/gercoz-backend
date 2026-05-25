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

// ── Types ────────────────────────────────────────────────────────────────────

type IngredientDef = {
  name: string; unit: Unit; costPrice: number;
  supplier: string; stock: number; minStock: number;
};

type ProductDef = {
  name: string; categoryIndex: number; salePrice: number;
  preparationTime: number;
  recipe: Array<{ ingIndex: number; qty: number; unit: Unit }>;
};

type RestaurantSeedConfig = {
  categories: Array<{ name: string; sortOrder: number }>;
  ingredients: IngredientDef[];
  products: ProductDef[];
  orderCount: number;
};

// ── Helper ───────────────────────────────────────────────────────────────────

async function seedRestaurantData(
  restaurantId: string,
  adminId: string,
  createdById: string,
  config: RestaurantSeedConfig,
) {
  const categories = await Promise.all(
    config.categories.map((c) =>
      prisma.category.create({ data: { restaurantId, name: c.name, sortOrder: c.sortOrder } }),
    ),
  );

  const ingredients = await Promise.all(
    config.ingredients.map((i) =>
      prisma.ingredient.create({
        data: {
          restaurantId,
          name: i.name, unit: i.unit, costPrice: i.costPrice,
          supplier: i.supplier, stock: i.stock, minStock: i.minStock,
        },
      }),
    ),
  );

  await Promise.all(
    ingredients.map((ing) =>
      prisma.ingredientPriceHistory.create({
        data: { ingredientId: ing.id, price: ing.costPrice, changedBy: adminId },
      }),
    ),
  );

  const products: Array<{ id: string; salePrice: number }> = [];
  for (const p of config.products) {
    const product = await prisma.product.create({
      data: {
        restaurantId,
        name: p.name,
        categoryId: categories[p.categoryIndex].id,
        salePrice: p.salePrice,
        preparationTime: p.preparationTime,
        recipeItems: {
          create: p.recipe.map((r) => ({
            ingredientId: ingredients[r.ingIndex].id,
            quantity: r.qty,
            unit: r.unit,
          })),
        },
      },
      select: { id: true, salePrice: true },
    });
    products.push(product);
  }

  const statuses: OrderStatus[] = [
    OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.DELIVERED,
  ];
  for (let i = 0; i < config.orderCount; i++) {
    const isMesa = i % 2 === 0;
    const p1 = products[i % products.length];
    const p2 = products[(i + 2) % products.length];
    const status = statuses[i % statuses.length];
    await prisma.order.create({
      data: {
        restaurantId,
        orderNumber: i + 1,
        type: isMesa ? OrderType.MESA : OrderType.BALCAO,
        tableNumber: isMesa ? (i % 8) + 1 : undefined,
        status,
        closedAt: status === OrderStatus.DELIVERED ? new Date() : undefined,
        createdBy: createdById,
        items: {
          create: [
            { productId: p1.id, quantity: 1, unitPrice: p1.salePrice },
            { productId: p2.id, quantity: 2, unitPrice: p2.salePrice },
          ],
        },
      },
    });
  }

  return { categories, ingredients, products };
}

// ── Restaurant configs ────────────────────────────────────────────────────────

const restaurant1Config: RestaurantSeedConfig = {
  categories: [
    { name: 'Lanches', sortOrder: 1 },
    { name: 'Pizzas', sortOrder: 2 },
    { name: 'Bebidas', sortOrder: 3 },
    { name: 'Sobremesas', sortOrder: 4 },
  ],
  ingredients: [
    { name: 'Farinha de trigo', unit: Unit.KG, costPrice: 4.5, supplier: 'Moinho', stock: 20, minStock: 5 },
    { name: 'Ovo', unit: Unit.UN, costPrice: 0.8, supplier: 'Granja', stock: 100, minStock: 20 },
    { name: 'Leite', unit: Unit.L, costPrice: 4.0, supplier: 'Laticínios', stock: 10, minStock: 3 },
    { name: 'Manteiga', unit: Unit.KG, costPrice: 28.0, supplier: 'Laticínios', stock: 5, minStock: 1 },
    { name: 'Açúcar', unit: Unit.KG, costPrice: 3.5, supplier: 'Usina', stock: 10, minStock: 2 },
    { name: 'Sal', unit: Unit.KG, costPrice: 2.0, supplier: 'Salinas', stock: 5, minStock: 1 },
    { name: 'Queijo muçarela', unit: Unit.KG, costPrice: 35.0, supplier: 'Laticínios', stock: 8, minStock: 2 },
    { name: 'Presunto', unit: Unit.KG, costPrice: 25.0, supplier: 'Frigorífico', stock: 5, minStock: 1 },
    { name: 'Tomate', unit: Unit.KG, costPrice: 6.0, supplier: 'Hortifruti', stock: 10, minStock: 2 },
    { name: 'Alface', unit: Unit.UN, costPrice: 2.5, supplier: 'Hortifruti', stock: 30, minStock: 10 },
    { name: 'Peito de frango', unit: Unit.KG, costPrice: 18.0, supplier: 'Frigorífico', stock: 15, minStock: 3 },
    { name: 'Pão de hambúrguer', unit: Unit.UN, costPrice: 1.5, supplier: 'Padaria', stock: 50, minStock: 10 },
  ],
  products: [
    { name: 'X-Burguer', categoryIndex: 0, salePrice: 18.0, preparationTime: 15,
      recipe: [{ ingIndex: 11, qty: 1, unit: Unit.UN }, { ingIndex: 6, qty: 0.1, unit: Unit.KG }, { ingIndex: 8, qty: 0.1, unit: Unit.KG }] },
    { name: 'X-Bacon', categoryIndex: 0, salePrice: 22.0, preparationTime: 15,
      recipe: [{ ingIndex: 11, qty: 1, unit: Unit.UN }, { ingIndex: 6, qty: 0.1, unit: Unit.KG }, { ingIndex: 7, qty: 0.1, unit: Unit.KG }] },
    { name: 'X-Salada', categoryIndex: 0, salePrice: 20.0, preparationTime: 12,
      recipe: [{ ingIndex: 11, qty: 1, unit: Unit.UN }, { ingIndex: 9, qty: 1, unit: Unit.UN }, { ingIndex: 8, qty: 0.1, unit: Unit.KG }] },
    { name: 'Pizza Margherita', categoryIndex: 1, salePrice: 45.0, preparationTime: 25,
      recipe: [{ ingIndex: 0, qty: 0.4, unit: Unit.KG }, { ingIndex: 6, qty: 0.2, unit: Unit.KG }, { ingIndex: 8, qty: 0.3, unit: Unit.KG }] },
    { name: 'Pizza Frango', categoryIndex: 1, salePrice: 52.0, preparationTime: 25,
      recipe: [{ ingIndex: 0, qty: 0.4, unit: Unit.KG }, { ingIndex: 10, qty: 0.3, unit: Unit.KG }, { ingIndex: 6, qty: 0.2, unit: Unit.KG }] },
    { name: 'Pizza Calabresa', categoryIndex: 1, salePrice: 48.0, preparationTime: 25,
      recipe: [{ ingIndex: 0, qty: 0.4, unit: Unit.KG }, { ingIndex: 6, qty: 0.2, unit: Unit.KG }, { ingIndex: 8, qty: 0.2, unit: Unit.KG }] },
    { name: 'Suco de Laranja', categoryIndex: 2, salePrice: 10.0, preparationTime: 5,
      recipe: [{ ingIndex: 4, qty: 0.05, unit: Unit.KG }] },
    { name: 'Refrigerante', categoryIndex: 2, salePrice: 7.0, preparationTime: 2, recipe: [] },
    { name: 'Água', categoryIndex: 2, salePrice: 4.0, preparationTime: 1, recipe: [] },
    { name: 'Brigadeiro', categoryIndex: 3, salePrice: 5.0, preparationTime: 10,
      recipe: [{ ingIndex: 2, qty: 0.1, unit: Unit.L }, { ingIndex: 4, qty: 0.05, unit: Unit.KG }, { ingIndex: 3, qty: 0.02, unit: Unit.KG }] },
    { name: 'Pudim', categoryIndex: 3, salePrice: 12.0, preparationTime: 60,
      recipe: [{ ingIndex: 2, qty: 0.5, unit: Unit.L }, { ingIndex: 1, qty: 3, unit: Unit.UN }, { ingIndex: 4, qty: 0.15, unit: Unit.KG }] },
    { name: 'Petit Gâteau', categoryIndex: 3, salePrice: 18.0, preparationTime: 20,
      recipe: [{ ingIndex: 0, qty: 0.1, unit: Unit.KG }, { ingIndex: 1, qty: 2, unit: Unit.UN }, { ingIndex: 3, qty: 0.08, unit: Unit.KG }] },
  ],
  orderCount: 12,
};

const restaurant2Config: RestaurantSeedConfig = {
  categories: [
    { name: 'Hambúrgueres', sortOrder: 1 },
    { name: 'Batatas Fritas', sortOrder: 2 },
    { name: 'Bebidas', sortOrder: 3 },
    { name: 'Sobremesas', sortOrder: 4 },
  ],
  ingredients: [
    { name: 'Pão brioche', unit: Unit.UN, costPrice: 1.8, supplier: 'Padaria Premium', stock: 60, minStock: 15 },
    { name: 'Carne bovina 180g', unit: Unit.UN, costPrice: 4.5, supplier: 'Frigorífico', stock: 80, minStock: 20 },
    { name: 'Queijo cheddar', unit: Unit.KG, costPrice: 32.0, supplier: 'Laticínios', stock: 5, minStock: 1 },
    { name: 'Alface americana', unit: Unit.UN, costPrice: 3.0, supplier: 'Hortifruti', stock: 40, minStock: 10 },
    { name: 'Tomate', unit: Unit.KG, costPrice: 6.5, supplier: 'Hortifruti', stock: 8, minStock: 2 },
    { name: 'Bacon fatiado', unit: Unit.KG, costPrice: 38.0, supplier: 'Frigorífico', stock: 4, minStock: 1 },
    { name: 'Batata palito', unit: Unit.KG, costPrice: 3.0, supplier: 'Atacado', stock: 30, minStock: 8 },
    { name: 'Óleo de fritura', unit: Unit.L, costPrice: 8.0, supplier: 'Distribuidor', stock: 10, minStock: 3 },
    { name: 'Sorvete creme', unit: Unit.KG, costPrice: 18.0, supplier: 'Sorveteria', stock: 6, minStock: 2 },
    { name: 'Molho especial', unit: Unit.KG, costPrice: 22.0, supplier: 'Fornecedor', stock: 3, minStock: 1 },
  ],
  products: [
    { name: 'Classic Burger', categoryIndex: 0, salePrice: 22.0, preparationTime: 12,
      recipe: [{ ingIndex: 0, qty: 1, unit: Unit.UN }, { ingIndex: 1, qty: 1, unit: Unit.UN }, { ingIndex: 2, qty: 0.05, unit: Unit.KG }, { ingIndex: 3, qty: 1, unit: Unit.UN }, { ingIndex: 4, qty: 0.08, unit: Unit.KG }] },
    { name: 'Double Burger', categoryIndex: 0, salePrice: 32.0, preparationTime: 15,
      recipe: [{ ingIndex: 0, qty: 1, unit: Unit.UN }, { ingIndex: 1, qty: 2, unit: Unit.UN }, { ingIndex: 2, qty: 0.08, unit: Unit.KG }, { ingIndex: 9, qty: 0.03, unit: Unit.KG }] },
    { name: 'Bacon Burger', categoryIndex: 0, salePrice: 28.0, preparationTime: 14,
      recipe: [{ ingIndex: 0, qty: 1, unit: Unit.UN }, { ingIndex: 1, qty: 1, unit: Unit.UN }, { ingIndex: 5, qty: 0.08, unit: Unit.KG }, { ingIndex: 2, qty: 0.05, unit: Unit.KG }] },
    { name: 'Cheeseburger', categoryIndex: 0, salePrice: 19.0, preparationTime: 10,
      recipe: [{ ingIndex: 0, qty: 1, unit: Unit.UN }, { ingIndex: 1, qty: 1, unit: Unit.UN }, { ingIndex: 2, qty: 0.06, unit: Unit.KG }] },
    { name: 'Batata Frita P', categoryIndex: 1, salePrice: 10.0, preparationTime: 8,
      recipe: [{ ingIndex: 6, qty: 0.15, unit: Unit.KG }, { ingIndex: 7, qty: 0.05, unit: Unit.L }] },
    { name: 'Batata Frita G', categoryIndex: 1, salePrice: 15.0, preparationTime: 8,
      recipe: [{ ingIndex: 6, qty: 0.25, unit: Unit.KG }, { ingIndex: 7, qty: 0.08, unit: Unit.L }] },
    { name: 'Refrigerante Lata', categoryIndex: 2, salePrice: 6.0, preparationTime: 1, recipe: [] },
    { name: 'Água Mineral', categoryIndex: 2, salePrice: 4.0, preparationTime: 1, recipe: [] },
    { name: 'Milk Shake Chocolate', categoryIndex: 3, salePrice: 18.0, preparationTime: 5,
      recipe: [{ ingIndex: 8, qty: 0.15, unit: Unit.KG }] },
    { name: 'Sundae', categoryIndex: 3, salePrice: 12.0, preparationTime: 3,
      recipe: [{ ingIndex: 8, qty: 0.1, unit: Unit.KG }] },
  ],
  orderCount: 10,
};

const restaurant3Config: RestaurantSeedConfig = {
  categories: [
    { name: 'Pizzas Salgadas', sortOrder: 1 },
    { name: 'Pizzas Doces', sortOrder: 2 },
    { name: 'Entradas', sortOrder: 3 },
    { name: 'Bebidas', sortOrder: 4 },
  ],
  ingredients: [
    { name: 'Farinha especial', unit: Unit.KG, costPrice: 5.5, supplier: 'Moinho Premium', stock: 25, minStock: 6 },
    { name: 'Molho de tomate', unit: Unit.KG, costPrice: 8.0, supplier: 'Conservas', stock: 12, minStock: 3 },
    { name: 'Queijo mussarela', unit: Unit.KG, costPrice: 38.0, supplier: 'Laticínios', stock: 10, minStock: 3 },
    { name: 'Frango desfiado', unit: Unit.KG, costPrice: 20.0, supplier: 'Frigorífico', stock: 8, minStock: 2 },
    { name: 'Calabresa', unit: Unit.KG, costPrice: 22.0, supplier: 'Frigorífico', stock: 6, minStock: 2 },
    { name: 'Catupiry', unit: Unit.KG, costPrice: 35.0, supplier: 'Laticínios', stock: 4, minStock: 1 },
    { name: 'Pepperoni', unit: Unit.KG, costPrice: 45.0, supplier: 'Importadora', stock: 3, minStock: 1 },
    { name: 'Chocolate em pó', unit: Unit.KG, costPrice: 28.0, supplier: 'Atacado', stock: 5, minStock: 1 },
    { name: 'Creme de leite', unit: Unit.L, costPrice: 12.0, supplier: 'Laticínios', stock: 6, minStock: 2 },
    { name: 'Alho', unit: Unit.KG, costPrice: 15.0, supplier: 'Hortifruti', stock: 2, minStock: 0.5 },
  ],
  products: [
    { name: 'Pizza Margherita M', categoryIndex: 0, salePrice: 42.0, preparationTime: 25,
      recipe: [{ ingIndex: 0, qty: 0.4, unit: Unit.KG }, { ingIndex: 1, qty: 0.15, unit: Unit.KG }, { ingIndex: 2, qty: 0.2, unit: Unit.KG }] },
    { name: 'Pizza Calabresa M', categoryIndex: 0, salePrice: 48.0, preparationTime: 25,
      recipe: [{ ingIndex: 0, qty: 0.4, unit: Unit.KG }, { ingIndex: 1, qty: 0.15, unit: Unit.KG }, { ingIndex: 4, qty: 0.15, unit: Unit.KG }, { ingIndex: 2, qty: 0.15, unit: Unit.KG }] },
    { name: 'Pizza Frango Catupiry M', categoryIndex: 0, salePrice: 52.0, preparationTime: 25,
      recipe: [{ ingIndex: 0, qty: 0.4, unit: Unit.KG }, { ingIndex: 3, qty: 0.2, unit: Unit.KG }, { ingIndex: 5, qty: 0.1, unit: Unit.KG }] },
    { name: 'Pizza Quatro Queijos G', categoryIndex: 0, salePrice: 65.0, preparationTime: 30,
      recipe: [{ ingIndex: 0, qty: 0.6, unit: Unit.KG }, { ingIndex: 2, qty: 0.25, unit: Unit.KG }, { ingIndex: 5, qty: 0.1, unit: Unit.KG }] },
    { name: 'Pizza Pepperoni G', categoryIndex: 0, salePrice: 68.0, preparationTime: 30,
      recipe: [{ ingIndex: 0, qty: 0.6, unit: Unit.KG }, { ingIndex: 6, qty: 0.15, unit: Unit.KG }, { ingIndex: 2, qty: 0.2, unit: Unit.KG }] },
    { name: 'Pizza Chocolate G', categoryIndex: 1, salePrice: 55.0, preparationTime: 25,
      recipe: [{ ingIndex: 0, qty: 0.6, unit: Unit.KG }, { ingIndex: 7, qty: 0.1, unit: Unit.KG }, { ingIndex: 8, qty: 0.15, unit: Unit.L }] },
    { name: 'Pizza Banana M', categoryIndex: 1, salePrice: 45.0, preparationTime: 22,
      recipe: [{ ingIndex: 0, qty: 0.4, unit: Unit.KG }, { ingIndex: 7, qty: 0.08, unit: Unit.KG }] },
    { name: 'Bruschetta', categoryIndex: 2, salePrice: 22.0, preparationTime: 10,
      recipe: [{ ingIndex: 0, qty: 0.1, unit: Unit.KG }, { ingIndex: 1, qty: 0.1, unit: Unit.KG }, { ingIndex: 9, qty: 0.01, unit: Unit.KG }] },
    { name: 'Água com Gás', categoryIndex: 3, salePrice: 6.0, preparationTime: 1, recipe: [] },
    { name: 'Suco Natural', categoryIndex: 3, salePrice: 12.0, preparationTime: 5, recipe: [] },
  ],
  orderCount: 10,
};

const restaurant4Config: RestaurantSeedConfig = {
  categories: [
    { name: 'Cafés', sortOrder: 1 },
    { name: 'Doces', sortOrder: 2 },
    { name: 'Salgados', sortOrder: 3 },
    { name: 'Sucos', sortOrder: 4 },
  ],
  ingredients: [
    { name: 'Café especial', unit: Unit.KG, costPrice: 60.0, supplier: 'Torrefação', stock: 5, minStock: 1 },
    { name: 'Leite integral', unit: Unit.L, costPrice: 5.0, supplier: 'Laticínios', stock: 15, minStock: 5 },
    { name: 'Açúcar refinado', unit: Unit.KG, costPrice: 4.0, supplier: 'Usina', stock: 8, minStock: 2 },
    { name: 'Chocolate em pó 70%', unit: Unit.KG, costPrice: 45.0, supplier: 'Cacauway', stock: 3, minStock: 1 },
    { name: 'Farinha de trigo', unit: Unit.KG, costPrice: 4.5, supplier: 'Moinho', stock: 10, minStock: 3 },
    { name: 'Ovo', unit: Unit.UN, costPrice: 0.8, supplier: 'Granja', stock: 60, minStock: 15 },
    { name: 'Polvilho azedo', unit: Unit.KG, costPrice: 8.0, supplier: 'Atacado', stock: 5, minStock: 1 },
    { name: 'Queijo minas', unit: Unit.KG, costPrice: 30.0, supplier: 'Laticínios', stock: 4, minStock: 1 },
    { name: 'Manteiga', unit: Unit.KG, costPrice: 28.0, supplier: 'Laticínios', stock: 3, minStock: 1 },
    { name: 'Laranja', unit: Unit.UN, costPrice: 0.5, supplier: 'Citrus', stock: 80, minStock: 20 },
  ],
  products: [
    { name: 'Espresso', categoryIndex: 0, salePrice: 8.0, preparationTime: 3,
      recipe: [{ ingIndex: 0, qty: 0.007, unit: Unit.KG }] },
    { name: 'Cappuccino', categoryIndex: 0, salePrice: 14.0, preparationTime: 5,
      recipe: [{ ingIndex: 0, qty: 0.007, unit: Unit.KG }, { ingIndex: 1, qty: 0.15, unit: Unit.L }] },
    { name: 'Café com Leite', categoryIndex: 0, salePrice: 10.0, preparationTime: 4,
      recipe: [{ ingIndex: 0, qty: 0.007, unit: Unit.KG }, { ingIndex: 1, qty: 0.1, unit: Unit.L }, { ingIndex: 2, qty: 0.01, unit: Unit.KG }] },
    { name: 'Chocolate Quente', categoryIndex: 0, salePrice: 12.0, preparationTime: 5,
      recipe: [{ ingIndex: 3, qty: 0.02, unit: Unit.KG }, { ingIndex: 1, qty: 0.2, unit: Unit.L }, { ingIndex: 2, qty: 0.01, unit: Unit.KG }] },
    { name: 'Bolo de Chocolate', categoryIndex: 1, salePrice: 9.0, preparationTime: 2,
      recipe: [{ ingIndex: 3, qty: 0.05, unit: Unit.KG }, { ingIndex: 4, qty: 0.08, unit: Unit.KG }, { ingIndex: 5, qty: 1, unit: Unit.UN }, { ingIndex: 8, qty: 0.03, unit: Unit.KG }] },
    { name: 'Brownie', categoryIndex: 1, salePrice: 10.0, preparationTime: 2,
      recipe: [{ ingIndex: 3, qty: 0.06, unit: Unit.KG }, { ingIndex: 8, qty: 0.04, unit: Unit.KG }, { ingIndex: 5, qty: 1, unit: Unit.UN }] },
    { name: 'Pão de Queijo', categoryIndex: 2, salePrice: 6.0, preparationTime: 8,
      recipe: [{ ingIndex: 6, qty: 0.05, unit: Unit.KG }, { ingIndex: 7, qty: 0.04, unit: Unit.KG }, { ingIndex: 5, qty: 1, unit: Unit.UN }] },
    { name: 'Croissant', categoryIndex: 2, salePrice: 9.0, preparationTime: 2,
      recipe: [{ ingIndex: 4, qty: 0.06, unit: Unit.KG }, { ingIndex: 8, qty: 0.02, unit: Unit.KG }] },
    { name: 'Suco de Laranja Natural', categoryIndex: 3, salePrice: 12.0, preparationTime: 5,
      recipe: [{ ingIndex: 9, qty: 3, unit: Unit.UN }, { ingIndex: 2, qty: 0.01, unit: Unit.KG }] },
    { name: 'Vitamina de Banana', categoryIndex: 3, salePrice: 14.0, preparationTime: 5,
      recipe: [{ ingIndex: 1, qty: 0.2, unit: Unit.L }] },
  ],
  orderCount: 10,
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Starting seed...');

  const restaurant1 = await prisma.restaurant.create({
    data: { name: 'Restaurante Demo', slug: 'demo', phone: '(11) 99999-9999', address: 'Rua Demo, 123' },
  });
  const restaurant2 = await prisma.restaurant.create({
    data: { name: 'Lanchonete Beta', slug: 'beta', phone: '(11) 88888-8888', address: 'Av. Beta, 456' },
  });
  const restaurant3 = await prisma.restaurant.create({
    data: { name: 'Pizzaria Gama', slug: 'gama', phone: '(41) 77777-7777', address: 'Rua Gama, 789' },
  });
  const restaurant4 = await prisma.restaurant.create({
    data: { name: 'Café Delta', slug: 'delta', phone: '(51) 66666-6666', address: 'Praça Delta, 10' },
  });

  console.log('Restaurants created: 4');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const cashierPassword = await bcrypt.hash('cashier123', 10);
  const cookPassword = await bcrypt.hash('cook123', 10);

  const admin = await prisma.user.create({
    data: { name: 'Admin', email: 'admin@demo.com', password: adminPassword },
  });
  const cashier = await prisma.user.create({
    data: { name: 'Caixa', email: 'caixa@demo.com', password: cashierPassword },
  });
  await prisma.user.create({
    data: { name: 'Cozinheiro', email: 'cozinha@demo.com', password: cookPassword },
  });

  console.log('Users created: 3');

  for (const rest of [restaurant1, restaurant2, restaurant3, restaurant4]) {
    await prisma.userRestaurant.create({
      data: { userId: admin.id, restaurantId: rest.id, role: UserRole.ADMIN },
    });
  }
  await prisma.userRestaurant.create({
    data: { userId: cashier.id, restaurantId: restaurant1.id, role: UserRole.CASHIER },
  });

  console.log('Memberships: admin→4 restaurants, cashier→1 restaurant');

  await seedRestaurantData(restaurant1.id, admin.id, cashier.id, restaurant1Config);
  console.log(`${restaurant1.name}: seeded`);

  await seedRestaurantData(restaurant2.id, admin.id, admin.id, restaurant2Config);
  console.log(`${restaurant2.name}: seeded`);

  await seedRestaurantData(restaurant3.id, admin.id, admin.id, restaurant3Config);
  console.log(`${restaurant3.name}: seeded`);

  await seedRestaurantData(restaurant4.id, admin.id, admin.id, restaurant4Config);
  console.log(`${restaurant4.name}: seeded`);

  console.log('');
  console.log('Seed completed successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Admin (4 empresas): admin@demo.com   / admin123');
  console.log('  Caixa (1 empresa):  caixa@demo.com   / cashier123');
  console.log('  Cook  (sem acesso): cozinha@demo.com / cook123');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

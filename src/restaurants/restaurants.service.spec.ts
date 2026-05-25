import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantsService } from './restaurants.service';
import { PrismaService } from '../common/prisma.service';
import { ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

const mockPrisma = {
  restaurant: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

describe('RestaurantsService', () => {
  let service: RestaurantsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<RestaurantsService>(RestaurantsService);
  });

  it('should throw ConflictException if slug already exists', async () => {
    mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'r1', slug: 'my-resto' });
    await expect(
      service.create({
        restaurantName: 'My Resto',
        slug: 'my-resto',
        adminName: 'Admin',
        adminEmail: 'admin@test.com',
        adminPassword: 'secret123',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should create restaurant, admin user and UserRestaurant in a transaction', async () => {
    mockPrisma.restaurant.findUnique.mockResolvedValue(null);
    const fakeRestaurant = { id: 'rest-1', slug: 'new-resto', name: 'New Resto' };
    const fakeUser = { id: 'u1' };
    const userRestaurantCreate = jest.fn().mockResolvedValue({ userId: 'u1', restaurantId: 'rest-1', role: UserRole.ADMIN });
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => fn({
      restaurant: { create: jest.fn().mockResolvedValue(fakeRestaurant) },
      user: { create: jest.fn().mockResolvedValue(fakeUser) },
      userRestaurant: { create: userRestaurantCreate },
    }));

    const result = await service.create({
      restaurantName: 'New Resto',
      slug: 'new-resto',
      adminName: 'Admin',
      adminEmail: 'admin@test.com',
      adminPassword: 'secret123',
    });

    expect(result).toMatchObject({ id: 'rest-1', slug: 'new-resto' });
    expect(userRestaurantCreate).toHaveBeenCalledWith({
      data: { userId: 'u1', restaurantId: 'rest-1', role: UserRole.ADMIN },
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const mockUser = {
  id: 'user-1',
  email: 'admin@test.com',
  password: bcrypt.hashSync('secret123', 10),
  isActive: true,
  name: 'Admin',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRestaurant = { id: 'rest-1', name: 'Restaurante Demo' };

const mockUserRestaurant = {
  restaurantId: 'rest-1',
  role: 'ADMIN',
  restaurant: mockRestaurant,
};

const mockPrisma = {
  user: { findFirst: jest.fn() },
  userRestaurant: { findMany: jest.fn(), findUnique: jest.fn() },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwt = {
  signAsync: jest.fn().mockResolvedValue('signed-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return partialToken and empresas on valid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.userRestaurant.findMany.mockResolvedValue([mockUserRestaurant]);

      const result = await service.login({ email: 'admin@test.com', password: 'secret123' });

      expect(result).toHaveProperty('partialToken', 'signed-token');
      expect(result.empresas).toEqual([
        { id: 'rest-1', nome: 'Restaurante Demo', role: 'ADMIN' },
      ]);
      expect(mockJwt.signAsync).toHaveBeenCalledWith(
        { sub: 'user-1', name: 'Admin', type: 'partial' },
        { expiresIn: '7d' },
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'secret123' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      await expect(service.login({ email: 'admin@test.com', password: 'wrongpass' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user has no empresa memberships', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.userRestaurant.findMany.mockResolvedValue([]);

      await expect(service.login({ email: 'admin@test.com', password: 'secret123' }))
        .rejects.toThrow(ForbiddenException);
      expect(mockJwt.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('selectEmpresa', () => {
    it('should return accessToken and refreshToken on valid restaurantId', async () => {
      mockPrisma.userRestaurant.findUnique.mockResolvedValue({
        ...mockUserRestaurant,
        userId: 'user-1',
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.selectEmpresa('user-1', 'Admin', 'rest-1');

      expect(result).toHaveProperty('accessToken', 'signed-token');
      expect(result).toHaveProperty('refreshToken');
      expect(mockJwt.signAsync).toHaveBeenCalledWith(
        { sub: 'user-1', restaurantId: 'rest-1', role: 'ADMIN', name: 'Admin', type: 'full' },
        { expiresIn: '15m' },
      );
    });

    it('should throw ForbiddenException if user has no access to restaurantId', async () => {
      mockPrisma.userRestaurant.findUnique.mockResolvedValue(null);
      await expect(service.selectEmpresa('user-1', 'Admin', 'rest-other'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if refresh token not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token is expired', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        restaurantId: 'rest-1',
        expiresAt: new Date(Date.now() - 1000),
        user: mockUser,
      });
      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should return new tokens on valid refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        restaurantId: 'rest-1',
        expiresAt: new Date(Date.now() + 60_000),
        user: mockUser,
      });
      mockPrisma.userRestaurant.findUnique.mockResolvedValue({ role: 'ADMIN' });
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('valid-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException and delete token when membership is null', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        restaurantId: 'rest-1',
        expiresAt: new Date(Date.now() + 60_000),
        user: mockUser,
      });
      mockPrisma.userRestaurant.findUnique.mockResolvedValue(null);
      mockPrisma.refreshToken.delete.mockResolvedValue({});

      await expect(service.refresh('valid-token')).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
    });
  });

  describe('logout', () => {
    it('should delete the refresh token', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
      await service.logout('some-token');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-token' },
      });
    });
  });
});

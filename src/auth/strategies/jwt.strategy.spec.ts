import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

const mockConfig = { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService;

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(mockConfig);
  });

  it('should return user object for full token payload', () => {
    const payload = { sub: 'user-1', restaurantId: 'rest-1', role: 'ADMIN', name: 'Admin', type: 'full' };
    const result = strategy.validate(payload);
    expect(result).toEqual({ userId: 'user-1', restaurantId: 'rest-1', role: 'ADMIN', name: 'Admin' });
  });

  it('should throw UnauthorizedException for partial token payload', () => {
    const payload = { sub: 'user-1', name: 'Admin', type: 'partial' };
    expect(() => strategy.validate(payload as any)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when type is missing', () => {
    const payload = { sub: 'user-1', restaurantId: 'rest-1', role: 'ADMIN', name: 'Admin' };
    expect(() => strategy.validate(payload as any)).toThrow(UnauthorizedException);
  });
});

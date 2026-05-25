import { UnauthorizedException } from '@nestjs/common';
import { PartialJwtStrategy } from './partial-jwt.strategy';
import { ConfigService } from '@nestjs/config';

const mockConfig = { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService;

describe('PartialJwtStrategy', () => {
  let strategy: PartialJwtStrategy;

  beforeEach(() => {
    strategy = new PartialJwtStrategy(mockConfig);
  });

  it('should return partial user for partial token payload', () => {
    const payload = { sub: 'user-1', name: 'Admin', type: 'partial' };
    const result = strategy.validate(payload);
    expect(result).toEqual({ userId: 'user-1', name: 'Admin' });
  });

  it('should throw UnauthorizedException for full token payload', () => {
    const payload = { sub: 'user-1', restaurantId: 'rest-1', role: 'ADMIN', name: 'Admin', type: 'full' };
    expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
  });
});

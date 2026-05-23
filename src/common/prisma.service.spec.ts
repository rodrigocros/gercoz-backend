import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { tenantStorage } from './tenant.context';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    service = module.get<PrismaService>(PrismaService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should expose tenantStorage', () => {
    expect(tenantStorage).toBeDefined();
    expect(typeof tenantStorage.run).toBe('function');
  });

  it('should run tenant context and retrieve restaurantId', (done) => {
    tenantStorage.run({ restaurantId: 'rest-abc' }, () => {
      const ctx = tenantStorage.getStore();
      expect(ctx?.restaurantId).toBe('rest-abc');
      done();
    });
  });
});
